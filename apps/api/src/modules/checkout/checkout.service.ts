// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require("stripe");
import type { CheckoutSessionCompletedEvent } from "stripe/cjs/resources/Events";
import { env } from "../../config/env";
import { Purchase } from "../../models/Purchase";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";
import { CATALOG, skuById } from "./checkout.catalog";
import sgMail from "@sendgrid/mail";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

export interface CartItem {
  skuId: string;
  qty: number;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const checkoutService = {
  listCatalog() {
    return CATALOG;
  },

  async createSession(userId: string, cart: CartItem[], shipping: ShippingAddress) {
    if (!cart.length) throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Cart is empty." });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = [];
    let subtotalCents = 0;
    const purchaseItems: { skuId: string; quantity: number; unitPriceCents: number }[] = [];

    for (const { skuId, qty } of cart) {
      const sku = skuById(skuId);
      if (!sku) throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: `Unknown SKU: ${skuId}` });
      if (qty < 1 || qty > 99) throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Quantity must be 1–99." });

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: sku.name, description: sku.description },
          unit_amount: sku.unitPriceCents,
        },
        quantity: qty,
      });
      subtotalCents += sku.unitPriceCents * qty;
      purchaseItems.push({ skuId, quantity: qty, unitPriceCents: sku.unitPriceCents });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${env.WEB_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.WEB_APP_URL}/checkout/cancel`,
      metadata: { userId, shippingAddress: JSON.stringify(shipping) },
      payment_intent_data: { metadata: { userId } },
    });

    await Purchase.create({
      userId,
      stripeSessionId: session.id,
      items: purchaseItems,
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
      currency: "USD",
      status: "pending",
      quantityGranted: 0,
      shippingAddressSnapshot: shipping,
    });

    return { sessionUrl: session.url! };
  },

  async getSessionStatus(sessionId: string, userId: string) {
    const purchase = await Purchase.findOne({ stripeSessionId: sessionId, userId });
    if (!purchase) throw AppError.notFound();
    return {
      status: purchase.status,
      quantityGranted: purchase.quantityGranted,
    };
  },

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Invalid Stripe signature." });
    }

    if (event.type === "checkout.session.completed") {
      const session = (event as CheckoutSessionCompletedEvent).data.object;
      await this._fulfil(session);
    }
  },

  async _fulfil(session: CheckoutSessionCompletedEvent.Data["object"]) {
    const purchase = await Purchase.findOne({ stripeSessionId: session.id });
    if (!purchase || purchase.status === "paid") return; // idempotent

    const totalCards = purchase.items.reduce((sum, item) => {
      const sku = skuById(item.skuId);
      return sum + (sku ? sku.quantity * item.quantity : 0);
    }, 0);

    purchase.status = "paid";
    purchase.stripePaymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    purchase.quantityGranted = totalCards;
    await purchase.save();

    await User.findByIdAndUpdate(purchase.userId, { $inc: { purchasedCards: totalCards } });

    try {
      const user = await User.findById(purchase.userId);
      if (user?.email) {
        sgMail.setApiKey(env.SENDGRID_API_KEY);
        await sgMail.send({
          to: user.email,
          from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
          subject: "Your Timewell order is confirmed",
          text: `Thank you! You've been granted ${totalCards} card credit${totalCards !== 1 ? "s" : ""}. Total: $${(purchase.totalCents / 100).toFixed(2)}.`,
          html: `<p>Thank you for your purchase! <strong>${totalCards} card credit${totalCards !== 1 ? "s" : ""}</strong> added to your account.</p><p>Total: <strong>$${(purchase.totalCents / 100).toFixed(2)}</strong>.</p><p><a href="${env.WEB_APP_URL}/dashboard">Start creating</a></p>`,
        });
      }
    } catch { /* receipt email is non-fatal */ }
  },
};
