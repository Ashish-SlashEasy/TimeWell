"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supportApi } from "@/lib/support";
import { getFriendlyMessage } from "@/lib/api";

const SUBJECTS = [
  "Getting started",
  "Setting up my card",
  "Ordering & shipping",
  "Contributions & media uploads",
  "Account & billing",
  "Something isn't working",
  "Other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
}

export function ContactDialog({ open, onClose, defaultName = "", defaultEmail = "" }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function handleClose() {
    if (loading) return;
    onClose();
    setTimeout(() => {
      setSent(false);
      setError("");
      setMessage("");
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      await supportApi.contact({
        subject,
        message: message.trim(),
        senderName: name.trim() || undefined,
        senderEmail: email.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Message sent</DialogTitle>
              <DialogDescription>
                We got your message and will get back to you soon.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ask us a question</DialogTitle>
              <DialogDescription>
                Fill in the form below and we&apos;ll reply to your email.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Topic</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question or issue…"
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !message.trim()}>
                {loading ? "Sending…" : "Send message"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
