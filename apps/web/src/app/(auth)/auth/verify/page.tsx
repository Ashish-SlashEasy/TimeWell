"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getFriendlyMessage } from "@/lib/api";
import { setAccessToken } from "@/lib/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    api
      .post<{ data: { accessToken: string; isNew: boolean } }>("/auth/verify", { token })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 1000);
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
          <CardTitle className="font-serif text-3xl">
            {status === "loading" && "Verifying…"}
            {status === "success" && "Signed in!"}
            {status === "error" && "Link expired"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait a moment."}
            {status === "success" && "Redirecting you to your dashboard…"}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button asChild>
              <Link href="/signin">Request a new link</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
