"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
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

const PasswordSchema = z.object({
  identifier: z
    .string()
    .min(1, "Enter your email or phone number.")
    .refine(
      (v) => z.string().email().safeParse(v).success || /^\+[1-9]\d{6,14}$/.test(v),
      "Enter a valid email or phone number.",
    ),
  password: z.string().min(1, "Enter your password."),
});

const OtpSchema = z.object({ code: z.string().length(6, "Enter the 6-digit code.") });

type Mode = "magic" | "password";
type Step = "input" | "otp";

function detectChannel(v: string): "email" | "phone" {
  return v.includes("@") ? "email" : "phone";
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [step, setStep] = useState<Step>("input");
  const [pendingPhone, setPendingPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const magicForm = useForm({ resolver: zodResolver(MagicSchema), defaultValues: { identifier: "" } });
  const passwordForm = useForm({ resolver: zodResolver(PasswordSchema), defaultValues: { identifier: "", password: "" } });
  const otpForm = useForm({ resolver: zodResolver(OtpSchema), defaultValues: { code: "" } });

  // watch identifier so we can show/hide the X button
  const identifierValue = passwordForm.watch("identifier");

  async function handleMagicSubmit({ identifier }: { identifier: string }) {
    setLoading(true); setError("");
    try {
      const channel = detectChannel(identifier);
      await api.post("/auth/magic-link", channel === "email" ? { email: identifier } : { phone: identifier });
      if (channel === "email") router.push(`/auth/check-email?email=${encodeURIComponent(identifier)}`);
      else { setPendingPhone(identifier); setStep("otp"); }
    } catch (e) { setError(getFriendlyMessage(e)); }
    finally { setLoading(false); }
  }

  async function handlePasswordSubmit({ identifier, password }: { identifier: string; password: string }) {
    setLoading(true); setError("");
    try {
      const channel = detectChannel(identifier);
      const body = channel === "email" ? { email: identifier, password } : { phone: identifier, password };
      const res = await api.post<{ data: { accessToken: string } }>("/auth/login", body);
      setAccessToken(res.data.data.accessToken);
      router.replace("/dashboard");
    } catch (e) { setError(getFriendlyMessage(e)); }
    finally { setLoading(false); }
  }

  async function handleOtpSubmit({ code }: { code: string }) {
    setLoading(true); setError("");
    try {
      const res = await api.post<{ data: { accessToken: string; isNew: boolean } }>("/auth/verify", { code, phone: pendingPhone });
      setAccessToken(res.data.data.accessToken);
      router.replace("/dashboard");
    } catch (e) { setError(getFriendlyMessage(e)); }
    finally { setLoading(false); }
  }

  function switchMode(next: Mode) {
    setMode(next); setStep("input"); setError("");
    magicForm.reset(); passwordForm.reset(); otpForm.reset();
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
          <h1 className="font-serif text-2xl text-foreground">Log in</h1>

          {/* ── Magic-link mode ── */}
          {mode === "magic" && step === "input" && (
            <>
              <form onSubmit={magicForm.handleSubmit(handleMagicSubmit)} className="space-y-3">
                <Input
                  placeholder="Your email or phone number"
                  autoComplete="email"
                  autoFocus
                  {...magicForm.register("identifier")}
                />
                {magicForm.formState.errors.identifier && (
                  <p className="text-xs text-destructive">{magicForm.formState.errors.identifier.message}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send me a magic link or code"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                We&apos;ll email or text you a secure link or one-time code. No password needed
              </p>
              <button
                type="button"
                className="w-full text-sm text-center text-foreground hover:underline"
                onClick={() => switchMode("password")}
              >
                Sign in with password
              </button>
              <hr className="border-border" />
              <p className="text-sm text-center text-muted-foreground">
                <Link href="/signup" className="text-foreground hover:underline">Sign up</Link>
              </p>
            </>
          )}

          {/* ── OTP step ── */}
          {mode === "magic" && step === "otp" && (
            <>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <strong>{pendingPhone}</strong>
                </p>
                <Input inputMode="numeric" maxLength={6} placeholder="000000" autoComplete="one-time-code" {...otpForm.register("code")} />
                {otpForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying…" : "Verify code"}
                </Button>
              </form>
              <button className="w-full text-sm text-center text-foreground hover:underline" onClick={() => { setStep("input"); setError(""); }}>
                Use a different number
              </button>
            </>
          )}

          {/* ── Password mode ── */}
          {mode === "password" && (
            <>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="relative">
                    <Input
                      placeholder="you@example.com or +919876543210"
                      autoComplete="email"
                      autoFocus
                      className="pr-8"
                      {...passwordForm.register("identifier")}
                    />
                    {identifierValue && (
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => passwordForm.setValue("identifier", "")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {passwordForm.formState.errors.identifier && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.identifier.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <Input type="password" autoComplete="current-password" {...passwordForm.register("password")} />
                  {passwordForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
                  )}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Log in"}
                </Button>
              </form>
              <div className="space-y-2 text-center">
                <p>
                  <Link href="/auth/forgot-password" className="text-sm text-foreground hover:underline">
                    Forgot password?
                  </Link>
                </p>
                <button className="w-full text-sm text-foreground hover:underline" onClick={() => switchMode("magic")}>
                  Sign in with code
                </button>
              </div>
              <hr className="border-border" />
              <p className="text-sm text-center">
                <Link href="/signup" className="text-foreground hover:underline">Sign up</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
