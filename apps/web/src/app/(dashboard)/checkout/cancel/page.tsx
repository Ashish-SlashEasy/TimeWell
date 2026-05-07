"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl">🛒</div>
        <div>
          <h1 className="font-serif text-3xl font-normal text-foreground mb-2">Payment not completed</h1>
          <p className="text-muted-foreground">Your payment was not completed. Your cart is saved.</p>
        </div>
        <Button className="w-full h-11" onClick={() => router.push("/checkout")}>
          Return to Checkout
        </Button>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
