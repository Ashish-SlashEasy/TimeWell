"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { checkoutApi } from "@/lib/checkout";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id") ?? "";
  const [status, setStatus] = useState<"polling" | "confirmed" | "failed">("polling");
  const [qty, setQty] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus("failed"); return; }
    let attempts = 0;
    const max = 20;

    async function poll() {
      try {
        const data = await checkoutApi.getSessionStatus(sessionId);
        if (data.status === "paid") {
          setQty(data.quantityGranted);
          setStatus("confirmed");
          sessionStorage.removeItem("tw_cart");
          return;
        }
        if (data.status === "failed") { setStatus("failed"); return; }
      } catch { /* keep polling */ }
      attempts++;
      if (attempts < max) setTimeout(poll, 2000);
      else setStatus("failed");
    }
    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "polling" && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-muted-foreground">Confirming your payment…</p>
          </>
        )}

        {status === "confirmed" && (
          <>
            <CheckCircle className="w-14 h-14 text-primary mx-auto" />
            <div>
              <h1 className="font-serif text-3xl font-normal text-foreground mb-2">Payment confirmed!</h1>
              <p className="text-muted-foreground">
                {qty} card credit{qty !== 1 ? "s have" : " has"} been added to your account.
                A receipt has been sent to your email.
              </p>
            </div>
            {sessionId && (
              <p className="text-xs text-muted-foreground">Order ref: {sessionId.slice(-12).toUpperCase()}</p>
            )}
            <Button className="w-full h-11" onClick={() => router.push("/dashboard")}>
              Start creating your card
            </Button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl">⚠️</div>
            <div>
              <h1 className="font-serif text-3xl font-normal text-foreground mb-2">Something went wrong</h1>
              <p className="text-muted-foreground">We couldn&apos;t confirm your payment. Please contact support if you were charged.</p>
            </div>
            <Button variant="outline" className="w-full h-11" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
