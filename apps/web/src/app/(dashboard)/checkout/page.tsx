"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { checkoutApi, type CartItem, type Sku } from "@/lib/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFriendlyMessage } from "@/lib/api";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("tw_cart");
    if (!saved) { router.replace("/buy"); return; }
    try { setCart(JSON.parse(saved)); } catch { router.replace("/buy"); }
  }, [router]);

  const { data: skus = [] } = useQuery({ queryKey: ["catalog"], queryFn: checkoutApi.catalog });

  const subtotalCents = cart.reduce((sum, { skuId, qty }) => {
    const sku = skus.find((s) => s.id === skuId);
    return sum + (sku ? sku.unitPriceCents * qty : 0);
  }, 0);

  const totalCards = cart.reduce((sum, { skuId, qty }) => {
    const sku = skus.find((s) => s.id === skuId);
    return sum + (sku ? sku.quantity * qty : 0);
  }, 0);

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function pay() {
    if (!form.fullName || !form.line1 || !form.city || !form.state || !form.postalCode || !form.country) {
      setError("Please fill in all required address fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { sessionUrl } = await checkoutApi.createSession(cart, {
        fullName: form.fullName,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      });
      window.location.href = sessionUrl;
    } catch (e) {
      setError(getFriendlyMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-serif text-4xl font-normal text-foreground mb-8">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Shipping address */}
          <div className="flex-1 space-y-5">
            <h2 className="font-semibold text-base text-foreground">Shipping Address</h2>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={form.fullName} onChange={field("fullName")} placeholder="Jane Smith" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="line1">Address Line 1 *</Label>
                <Input id="line1" value={form.line1} onChange={field("line1")} placeholder="123 Main St" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="line2">Address Line 2</Label>
                <Input id="line2" value={form.line2} onChange={field("line2")} placeholder="Apt 4B (optional)" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" value={form.city} onChange={field("city")} placeholder="New York" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" value={form.state} onChange={field("state")} placeholder="NY" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input id="postalCode" value={form.postalCode} onChange={field("postalCode")} placeholder="10001" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" value={form.country} onChange={field("country")} placeholder="US" maxLength={2} className="mt-1 uppercase" />
                </div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-6 rounded-xl border border-border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-base text-foreground">Order Summary</h2>

              <ul className="space-y-2">
                {cart.map(({ skuId, qty }) => {
                  const sku = skus.find((s) => s.id === skuId);
                  if (!sku) return null;
                  return (
                    <li key={skuId} className="flex justify-between text-sm">
                      <span className="text-foreground/80">{sku.name} × {qty}</span>
                      <span className="font-medium">{fmt(sku.unitPriceCents * qty)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{fmt(subtotalCents)}</span>
                </div>
                {totalCards > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">{totalCards} card credit{totalCards !== 1 ? "s" : ""} added on payment.</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full h-11" onClick={pay} disabled={submitting || cart.length === 0}>
                {submitting ? "Redirecting…" : "Pay with Stripe"}
              </Button>

              <button
                onClick={() => router.push("/buy")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to products
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
