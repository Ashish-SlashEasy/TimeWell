"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: { newPassword: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Invalid link</CardTitle>
            <CardDescription>This password reset link is missing or invalid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot-password" className="text-primary underline underline-offset-4 text-sm">
              Request a new one
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit({ newPassword }: { newPassword: string; confirm: string }) {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      router.replace("/login?reset=1");
    } catch (e) {
      setError(getFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">Set new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...form.register("confirm")}
              />
              {form.formState.errors.confirm && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirm.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
