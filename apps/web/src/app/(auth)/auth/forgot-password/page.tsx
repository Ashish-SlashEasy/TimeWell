"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api, getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Schema = z.object({
  identifier: z
    .string()
    .min(1, "Enter your email address.")
    .refine(
      (v) => z.string().email().safeParse(v).success,
      "Enter a valid email address.",
    ),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: { identifier: "" },
  });

  async function handleSubmit({ identifier }: { identifier: string }) {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: identifier });
      setSent(true);
    } catch (e) {
      setError(getFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Forgot password?</CardTitle>
          <CardDescription>
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
              <div className="space-y-1 text-left">
                <Label htmlFor="identifier">Email address</Label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...form.register("identifier")}
                />
                {form.formState.errors.identifier && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.identifier.message}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                className="text-primary underline underline-offset-4"
                onClick={() => setSent(false)}
              >
                try again
              </button>
              .
            </p>
          )}
          <Link href="/login" className="block text-sm text-primary underline underline-offset-4">
            Back to log in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
