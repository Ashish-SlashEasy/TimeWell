"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contributionsApi, type Contribution } from "@/lib/cards";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadFormProps {
  cardId: string;
  onUploaded: () => void;
}

function UploadForm({ cardId, onUploaded }: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [senderName, setSenderName] = useState("");
  const [senderMessage, setSenderMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !senderName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await contributionsApi.upload(cardId, file, senderName.trim(), senderMessage.trim() || undefined);
      setSenderName("");
      setSenderMessage("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-card">
      <h3 className="font-medium text-sm">Add a photo</h3>
      <div className="space-y-1">
        <Label htmlFor="photo-file">Photo</Label>
        <input
          id="photo-file"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border file:border-input file:text-sm file:bg-background cursor-pointer"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sender-name">Your name</Label>
        <Input
          id="sender-name"
          placeholder="e.g. Alice"
          maxLength={60}
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sender-msg">Message (optional)</Label>
        <Input
          id="sender-msg"
          placeholder="Say something nice…"
          maxLength={280}
          value={senderMessage}
          onChange={(e) => setSenderMessage(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={loading || !senderName.trim()}>
        {loading ? "Uploading…" : "Upload photo"}
      </Button>
    </form>
  );
}

interface Props {
  cardId: string;
}

export function ImageTab({ cardId }: Props) {
  const queryClient = useQueryClient();
  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ["contributions", cardId],
    queryFn: () => contributionsApi.list(cardId),
  });

  const photos = contributions.filter((c) => c.status === "public");

  return (
    <div className="space-y-6">
      <UploadForm
        cardId={cardId}
        onUploaded={() => queryClient.invalidateQueries({ queryKey: ["contributions", cardId] })}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No photos yet. Be the first to add one!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((c) => (
            <div key={c.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.mediaKey}
                alt={`Photo from ${c.senderName}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate">{c.senderName}</p>
                {c.senderMessage && (
                  <p className="text-white/80 text-xs truncate">{c.senderMessage}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
