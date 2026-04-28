"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api, getFriendlyMessage } from "@/lib/api";
import { setAccessToken } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const EmailSchema = z.object({ email: z.string().email("Enter a valid email address.") });
const PhoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Enter number in E.164 format, e.g. +14155550100"),
});
const OtpSchema = z.object({ code: z.string().length(6, "Enter the 6-digit code.") });

type Tab = "email" | "phone";
type Step = "input" | "otp";

export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");
  const [step, setStep] = useState<Step>("input");
  const [pendingPhone, setPendingPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailForm = useForm({ resolver: zodResolver(EmailSchema), defaultValues: { email: "" } });
  const phoneForm = useForm({ resolver: zodResolver(PhoneSchema), defaultValues: { phone: "" } });
  const otpForm = useForm({ resolver: zodResolver(OtpSchema), defaultValues: { code: "" } });

  async function handleEmailSubmit(values: { email: string }) {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/signup", { email: values.email });
      router.push(`/auth/check-email?email=${encodeURIComponent(values.email)}`);
    } catch (e) {
      setError(getFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(values: { phone: string }) {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/signup", { phone: values.phone });
      setPendingPhone(values.phone);
      setStep("otp");
    } catch (e) {
      setError(getFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(values: { code: string }) {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ data: { accessToken: string } }>("/auth/verify", {
        code: values.code,
        phone: pendingPhone,
      });
      setAccessToken(res.data.data.accessToken);
      router.push("/dashboard");
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
          <CardTitle className="font-serif text-3xl">Timewell</CardTitle>
          <CardDescription>Sign in or create an account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === "email" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => { setTab("email"); setStep("input"); setError(""); }}
            >
              Email
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === "phone" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => { setTab("phone"); setStep("input"); setError(""); }}
            >
              Phone
            </button>
          </div>

          {/* Email form */}
          {tab === "email" && (
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...emailForm.register("email")} />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send magic link"}
              </Button>
            </form>
          )}

          {/* Phone form */}
          {tab === "phone" && step === "input" && (
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="+14155550100" {...phoneForm.register("phone")} />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </Button>
            </form>
          )}

          {/* OTP form */}
          {tab === "phone" && step === "otp" && (
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to {pendingPhone}
              </p>
              <div className="space-y-1">
                <Label htmlFor="code">Verification code</Label>
                <Input id="code" inputMode="numeric" maxLength={6} placeholder="123456" {...otpForm.register("code")} />
                {otpForm.formState.errors.code && (
                  <p className="text-sm text-destructive">{otpForm.formState.errors.code.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("input"); setError(""); }}
              >
                Use a different number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
