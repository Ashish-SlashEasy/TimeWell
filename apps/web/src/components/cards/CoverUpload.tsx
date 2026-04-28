"use client";

import { useRef, useState } from "react";
import { cardsApi, type Card } from "@/lib/cards";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Props {
  card: Card;
  onUpdated: (card: Card) => void;
}

export function CoverUpload({ card, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const updated = await cardsApi.uploadCover(card.id, file);
      onUpdated(updated);
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const thumb = card.coverImage?.thumb;

  return (
    <div className="relative group">
      <div
        className="aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt="Card cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-3xl">📷</span>
            <span className="text-sm">Upload cover photo</span>
          </div>
        )}

        {/* Hover overlay */}
        {thumb && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-medium">Change cover</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {loading && (
        <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground animate-pulse">Uploading…</span>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
