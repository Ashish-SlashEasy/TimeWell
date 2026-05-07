"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getFriendlyMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ConfirmEmailChangeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token found in the link.");
      return;
    }
    api
      .post("/users/me/confirm-email-change", { token })
      .then(() => {
        setStatus("success");
        setTimeout(() => router.replace("/account"), 2000);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(getFriendlyMessage(e));
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            {status === "loading" && "Confirming…"}
            {status === "success" && "Email updated!"}
            {status === "error" && "Link invalid"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait a moment."}
            {status === "success" && "Your email address has been updated. Redirecting…"}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/account">Back to Account</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <ConfirmEmailChangeInner />
    </Suspense>
  );
}
