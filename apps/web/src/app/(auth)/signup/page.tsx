"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getFriendlyMessage } from "@/lib/api";
import { setAccessToken } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── schemas ───────────────────────────────────────────────────────────────────

const MagicSchema = z.object({
  identifier: z
    .string()
    .min(1, "Enter your email or phone number.")
    .refine(
      (v) => z.string().email().safeParse(v).success || /^\+[1-9]\d{6,14}$/.test(v),
      "Enter a valid email or phone number.",
    ),
});

const OtpSchema = z.object({ code: z.string().length(6, "Enter the 6-digit code.") });

type Step = "input" | "otp";

function detectChannel(v: string): "email" | "phone" {
  return v.includes("@") ? "email" : "phone";
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [pendingPhone, setPendingPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm({ resolver: zodResolver(MagicSchema), defaultValues: { identifier: "" } });
  const otpForm = useForm({ resolver: zodResolver(OtpSchema), defaultValues: { code: "" } });

  async function handleSubmit({ identifier }: { identifier: string }) {
    setLoading(true); setError("");
    try {
      const channel = detectChannel(identifier);
      await api.post("/auth/signup", channel === "email" ? { email: identifier } : { phone: identifier });
      if (channel === "email") {
        router.push(`/auth/check-email?email=${encodeURIComponent(identifier)}`);
      } else {
        setPendingPhone(identifier);
        setStep("otp");
      }
    } catch (e) { setError(getFriendlyMessage(e)); }
    finally { setLoading(false); }
  }

  async function handleOtpSubmit({ code }: { code: string }) {
    setLoading(true); setError("");
    try {
      const res = await api.post<{ data: { accessToken: string; isNew: boolean } }>("/auth/verify", { code, phone: pendingPhone });
      setAccessToken(res.data.data.accessToken);
      router.replace(res.data.data.isNew ? "/auth/set-password" : "/dashboard");
    } catch (e) { setError(getFriendlyMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-background">
        <div className="h-12 flex items-center justify-center">
          <span className="font-serif text-xl text-foreground">Timewell</span>
        </div>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[340px] bg-card rounded-xl border border-border p-7 space-y-5">
          <h1 className="font-serif text-2xl text-foreground">Sign up</h1>

          {/* ── Input step ── */}
          {step === "input" && (
            <>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
                <Input
                  placeholder="Your email or phone number"
                  autoComplete="email"
                  autoFocus
                  {...form.register("identifier")}
                />
                {form.formState.errors.identifier && (
                  <p className="text-xs text-destructive">{form.formState.errors.identifier.message}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send me a magic link or code"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                We&apos;ll email or text you a secure link or one-time code. No password needed
              </p>
              <Link
                href="/login?mode=password"
                className="block w-full text-sm text-center text-foreground hover:underline"
              >
                Sign up with password
              </Link>
              <hr className="border-border" />
              <p className="text-sm text-center text-muted-foreground">
                <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── OTP step ── */}
          {step === "otp" && (
            <>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-3">
                <Input value={pendingPhone} readOnly className="bg-muted/40 text-muted-foreground" />
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="One-time code"
                  autoComplete="one-time-code"
                  autoFocus
                  {...otpForm.register("code")}
                />
                {otpForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying…" : "Continue"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                We&apos;ve sent a secure code to your number.{" "}
                <button
                  type="button"
                  className="text-foreground hover:underline"
                  onClick={() => { setStep("input"); setError(""); otpForm.reset(); }}
                >
                  Resend it.
                </button>
              </p>
              <hr className="border-border" />
              <p className="text-sm text-center text-muted-foreground">
                <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
