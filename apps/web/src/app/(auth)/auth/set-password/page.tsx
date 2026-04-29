"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api, getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export default function SetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: { password: "" },
  });

  async function handleSubmit({ password }: { password: string }) {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/set-password", { password });
      router.replace("/dashboard");
    } catch (e) {
      setError(getFriendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
        <h1 className="font-serif text-2xl text-foreground leading-snug">
          Want faster access next time? Set a password.
        </h1>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <Input
            type="password"
            placeholder="Set a password"
            autoComplete="new-password"
            autoFocus
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Continue"}
          </Button>
        </form>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.replace("/dashboard")}
        >
          Skip
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You can always do this later in Account Settings
        </p>
      </div>
    </div>
  );
}
