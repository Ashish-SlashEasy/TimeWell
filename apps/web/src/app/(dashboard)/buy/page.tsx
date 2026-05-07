"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { checkoutApi, type Sku, type CartItem } from "@/lib/checkout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BuyPage() {
  const router = useRouter();
  const { data: skus = [], isLoading } = useQuery({ queryKey: ["catalog"], queryFn: checkoutApi.catalog });
  const [qtys, setQtys] = useState<Record<string, number>>({});

  function setQty(skuId: string, val: number) {
    setQtys((prev) => ({ ...prev, [skuId]: Math.max(0, Math.min(99, val)) }));
  }

  const cartItems: CartItem[] = skus
    .map((s) => ({ skuId: s.id, qty: qtys[s.id] ?? 0 }))
    .filter((i) => i.qty > 0);

  const subtotalCents = skus.reduce((sum, s) => {
    const qty = qtys[s.id] ?? 0;
    return sum + s.unitPriceCents * qty;
  }, 0);

  const totalCards = skus.reduce((sum, s) => {
    const qty = qtys[s.id] ?? 0;
    return sum + s.quantity * qty;
  }, 0);

  function proceed() {
    if (!cartItems.length) return;
    sessionStorage.setItem("tw_cart", JSON.stringify(cartItems));
    router.push("/checkout");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mb-2">Buy Cards</h1>
        <p className="text-muted-foreground mb-10">Choose a pack and add card credits to your account.</p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* SKU cards */}
          <div className="flex-1 space-y-4">
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                ))
              : skus.map((sku) => (
                  <SkuCard
                    key={sku.id}
                    sku={sku}
                    qty={qtys[sku.id] ?? 0}
                    onChange={(v) => setQty(sku.id, v)}
                  />
                ))}
          </div>

          {/* Order summary */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-6 rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <h2 className="font-semibold text-base text-foreground">Order Summary</h2>

              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items selected yet.</p>
              ) : (
                <ul className="space-y-2">
                  {cartItems.map(({ skuId, qty }) => {
                    const sku = skus.find((s) => s.id === skuId)!;
                    return (
                      <li key={skuId} className="flex justify-between text-sm">
                        <span className="text-foreground/80">{sku.name} × {qty}</span>
                        <span className="font-medium">{fmt(sku.unitPriceCents * qty)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1">
                  <span>Total</span>
                  <span>{fmt(subtotalCents)}</span>
                </div>
                {totalCards > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">{totalCards} card credit{totalCards !== 1 ? "s" : ""} will be added to your account.</p>
                )}
              </div>

              <Button
                className="w-full h-11"
                disabled={cartItems.length === 0}
                onClick={proceed}
              >
                Continue to Checkout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkuCard({ sku, qty, onChange }: { sku: Sku; qty: number; onChange: (v: number) => void }) {
  const selected = qty > 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex items-center justify-between gap-4 transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-semibold text-base text-foreground">{sku.name}</span>
          <span className="text-xs text-muted-foreground">{sku.quantity} card{sku.quantity !== 1 ? "s" : ""}</span>
        </div>
        <p className="text-sm text-muted-foreground">{sku.description}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{fmt(sku.unitPriceCents)} <span className="text-sm font-normal text-muted-foreground">/ pack</span></p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(qty - 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
        <button
          onClick={() => onChange(qty + 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
