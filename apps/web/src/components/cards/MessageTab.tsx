"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contributionsApi, type Contribution } from "@/lib/cards";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Props {
  cardId: string;
}

export function MessageTab({ cardId }: Props) {
  const queryClient = useQueryClient();
  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ["contributions", cardId],
    queryFn: () => contributionsApi.list(cardId),
  });

  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // For message-only contributions we still need a "photo" — use a 1x1 transparent PNG
  // generated on the client so the endpoint (which expects a file) is satisfied.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;
    setLoading(true);
    setError("");
    setSent(false);
    try {
      // Create a minimal 1x1 canvas JPEG as a placeholder image
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg"));
      const file = new File([blob], "message.jpg", { type: "image/jpeg" });
      await contributionsApi.upload(cardId, file, senderName.trim(), message.trim());
      setSenderName("");
      setMessage("");
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["contributions", cardId] });
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const messages = contributions.filter((c) => c.senderMessage && c.status === "public");

  return (
    <div className="space-y-6">
      {/* Write a message form */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-card">
        <h3 className="font-medium text-sm">Leave a message</h3>
        <div className="space-y-1">
          <Label htmlFor="msg-name">Your name</Label>
          <Input
            id="msg-name"
            placeholder="e.g. Alice"
            maxLength={60}
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="msg-text">Message</Label>
          <Textarea
            id="msg-text"
            placeholder="Write something heartfelt…"
            maxLength={280}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/280</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {sent && <p className="text-sm text-primary">Your message was sent!</p>}
        <Button type="submit" size="sm" disabled={loading || !senderName.trim() || !message.trim()}>
          {loading ? "Sending…" : "Send message"}
        </Button>
      </form>

      {/* Message list */}
      {!isLoading && messages.length > 0 && (
        <div className="space-y-3">
          <Separator />
          {messages.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-1">
              <p className="text-sm">{c.senderMessage}</p>
              <p className="text-xs text-muted-foreground">
                — {c.senderName} · {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No messages yet. Be the first!
        </p>
      )}
    </div>
  );
}
