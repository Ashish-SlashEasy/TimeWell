"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, getFriendlyMessage } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PublicUser } from "@timewell/shared";

// ── schemas ──────────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Use E.164 format, e.g. +919876543210")
    .or(z.literal("")),
});

const PwSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "At least 8 characters.").max(128),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

const OtpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code."),
});

// ── read-only field ───────────────────────────────────────────────────────────

function FieldView({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  return (
    <div className="rounded border border-border bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{masked ? "••••••••••••••••" : value || "—"}</p>
    </div>
  );
}

// ── editable field ────────────────────────────────────────────────────────────

function FieldEdit({
  label,
  value,
  onChange,
  onClear,
  type = "text",
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-8"
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<PublicUser>({
    queryKey: ["me"],
    queryFn: () => api.get<{ data: PublicUser }>("/users/me").then((r) => r.data.data),
  });

  // edit state
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof fields, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // email-change pending banner
  const [emailPending, setEmailPending] = useState("");

  // phone OTP inline
  const [phoneOtpMode, setPhoneOtpMode] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpForm = useForm({ resolver: zodResolver(OtpSchema), defaultValues: { code: "" } });

  // password modal
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const pwForm = useForm({ resolver: zodResolver(PwSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  // populate fields when user loads
  useEffect(() => {
    if (user) {
      setFields({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
      });
    }
  }, [user]);

  function startEdit() {
    setEditing(true);
    setFieldErrors({});
    setSaveError("");
    setEmailPending("");
    setPhoneOtpMode(false);
  }

  function cancelEdit() {
    if (user) {
      setFields({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
      });
    }
    setEditing(false);
    setFieldErrors({});
    setSaveError("");
  }

  async function handleSave() {
    // Validate
    const result = ProfileSchema.safeParse(fields);
    if (!result.success) {
      const errs: typeof fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof typeof fields;
        errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, string> = {
        firstName: fields.firstName,
        lastName: fields.lastName,
      };
      if (fields.email !== (user?.email ?? "")) payload.email = fields.email;
      if (fields.phone !== (user?.phone ?? "") && fields.phone) payload.phone = fields.phone;

      const res = await api.patch<{
        data: { user: PublicUser; emailChangePending: boolean; phoneChangePending: boolean };
      }>("/users/me", payload);

      queryClient.setQueryData(["me"], res.data.data.user);

      if (res.data.data.emailChangePending) {
        setEmailPending(fields.email);
        setEditing(false);
      } else if (res.data.data.phoneChangePending) {
        setPhoneOtpMode(true);
        setEditing(false);
      } else {
        setEditing(false);
      }
    } catch (e) {
      setSaveError(getFriendlyMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleOtpSubmit({ code }: { code: string }) {
    setOtpError("");
    try {
      await api.post("/users/me/confirm-phone-change", { code });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setPhoneOtpMode(false);
      otpForm.reset();
    } catch (e) {
      setOtpError(getFriendlyMessage(e));
    }
  }

  async function handlePasswordSave(values: z.infer<typeof PwSchema>) {
    setPwSaving(true);
    setPwError("");
    try {
      await api.post("/users/me/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setPwSuccess(true);
      setTimeout(() => {
        clearAccessToken();
        queryClient.clear();
        router.replace("/login");
      }, 1500);
    } catch (e) {
      setPwError(getFriendlyMessage(e));
    } finally {
      setPwSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6 animate-pulse max-w-xl">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl">
      <h1 className="font-serif text-3xl text-foreground mb-6">Account</h1>

      {/* Email-change banner */}
      {emailPending && (
        <div className="mb-5 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          Verification email sent to <strong>{emailPending}</strong>. Click the link in that email to confirm your new address.
        </div>
      )}

      {/* Manage Account card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Manage Account</h2>
          {!editing && !phoneOtpMode && (
            <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        {/* View mode */}
        {!editing && !phoneOtpMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldView label="First Name" value={user?.firstName ?? ""} />
              <FieldView label="Last Name" value={user?.lastName ?? ""} />
            </div>
            <FieldView label="Email Address" value={user?.email ?? ""} />
            <div
              className="rounded border border-border bg-muted/40 px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors"
              onClick={() => { setPwOpen(true); setPwError(""); setPwSuccess(false); pwForm.reset(); }}
            >
              <p className="text-xs text-muted-foreground mb-0.5">Password</p>
              <p className="text-sm text-foreground">••••••••••••••••</p>
            </div>
            <FieldView label="Phone Number" value={user?.phone ?? ""} />
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldEdit
                label="First Name"
                value={fields.firstName}
                onChange={(v) => setFields((f) => ({ ...f, firstName: v }))}
                error={fieldErrors.firstName}
              />
              <FieldEdit
                label="Last Name"
                value={fields.lastName}
                onChange={(v) => setFields((f) => ({ ...f, lastName: v }))}
                error={fieldErrors.lastName}
              />
            </div>
            <FieldEdit
              label="Email Address"
              value={fields.email}
              onChange={(v) => setFields((f) => ({ ...f, email: v }))}
              onClear={() => setFields((f) => ({ ...f, email: "" }))}
              error={fieldErrors.email}
            />
            <div
              className="rounded border border-border bg-muted/40 px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors"
              onClick={() => { setPwOpen(true); setPwError(""); setPwSuccess(false); pwForm.reset(); }}
            >
              <p className="text-xs text-muted-foreground mb-0.5">Password</p>
              <p className="text-sm text-foreground">•••••••••••••••• <span className="text-xs text-primary underline ml-1">Change</span></p>
            </div>
            <FieldEdit
              label="Phone Number"
              value={fields.phone}
              onChange={(v) => setFields((f) => ({ ...f, phone: v }))}
              placeholder="+919876543210"
              error={fieldErrors.phone}
            />
          </div>
        )}

        {/* Phone OTP inline */}
        {phoneOtpMode && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{fields.phone}</strong> to confirm your new number.
            </p>
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                className="max-w-[160px]"
                {...otpForm.register("code")}
              />
              <Button type="submit">Verify</Button>
              <Button type="button" variant="ghost" onClick={() => setPhoneOtpMode(false)}>Cancel</Button>
            </form>
            {otpError && <p className="text-sm text-destructive">{otpError}</p>}
          </div>
        )}
      </div>

      {/* Log out */}
      <div className="mt-6">
        <Button
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
          onClick={async () => {
            try { await api.post("/auth/logout"); } catch { /* ignore */ }
            clearAccessToken();
            queryClient.clear();
            router.replace("/login");
          }}
        >
          Log Out
        </Button>
      </div>

      {/* Password change modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Change Password</DialogTitle>
          </DialogHeader>
          {pwSuccess ? (
            <p className="text-sm text-foreground py-2">Password updated. Signing you out…</p>
          ) : (
            <form onSubmit={pwForm.handleSubmit(handlePasswordSave)} className="space-y-3 pt-1">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current password</p>
                <Input type="password" autoComplete="current-password" {...pwForm.register("currentPassword")} />
                {pwForm.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{pwForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">New password</p>
                <Input type="password" autoComplete="new-password" {...pwForm.register("newPassword")} />
                {pwForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{pwForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Confirm new password</p>
                <Input type="password" autoComplete="new-password" {...pwForm.register("confirmPassword")} />
                {pwForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{pwForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
              <Button type="submit" className="w-full" disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
