"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowUp, Eye, Trash2, Copy, Check, PackageCheck, X } from "lucide-react";
import { cardsApi, type Card, type ShippingAddress } from "@/lib/cards";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props { params: { id: string } }

type Tab = "image" | "message" | "sharing";
type Side = "front" | "back";

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

// ── Shipping address dialog ───────────────────────────────────────────────────

const EMPTY_ADDR: ShippingAddress = {
  fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US",
};

function SubmitOrderDialog({
  cardId,
  onSuccess,
  onClose,
}: {
  cardId: string;
  onSuccess: (card: Card) => void;
  onClose: () => void;
}) {
  const [addr, setAddr] = useState<ShippingAddress>(EMPTY_ADDR);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => cardsApi.submitOrder(cardId, { ...addr, line2: addr.line2 || null }),
    onSuccess: (card) => onSuccess(card),
    onError: (err) => setError(getFriendlyMessage(err)),
  });

  function set(field: keyof ShippingAddress, value: string) {
    setAddr((prev) => ({ ...prev, [field]: value }));
  }

  const canSubmit =
    addr.fullName.trim() &&
    addr.line1.trim() &&
    addr.city.trim() &&
    addr.state.trim() &&
    addr.postalCode.trim() &&
    addr.country.trim();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-normal">Shipping Address</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Jane Smith" value={addr.fullName} onChange={(e) => set("fullName", e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 1</Label>
            <Input placeholder="123 Main St" value={addr.line1} onChange={(e) => set("line1", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Apt 4B" value={addr.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input placeholder="New York" value={addr.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State / Province</Label>
              <Input placeholder="NY" value={addr.state} onChange={(e) => set("state", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input placeholder="10001" value={addr.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Country (2-letter)</Label>
              <Input placeholder="US" maxLength={2} value={addr.country} onChange={(e) => set("country", e.target.value.toUpperCase())} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Submitting…" : "Submit Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Editor top bar ────────────────────────────────────────────────────────────

function EditorHeader({ onBack, card, onCardUpdate, onPreview }: { onBack: () => void; card: Card | null; onCardUpdate: (card: Card) => void; onPreview?: () => void }) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const shareUrl = card ? `/message/${card.shareToken}` : "#";
  const fullShareUrl = card ? `${appUrl}/message/${card.shareToken}` : "";
  const [showShare, setShowShare] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    }
    if (showShare) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShare]);

  async function copyLink() {
    if (!card) return;
    await navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openOrderDialog() {
    setShowShare(false);
    setShowOrderDialog(true);
  }

  function handleOrderSuccess(updatedCard: Card) {
    setShowOrderDialog(false);
    onCardUpdate(updatedCard);
  }

  const isOrdered = card?.status === "ordered";

  return (
    <>
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="h-14 relative flex items-center px-4 sm:px-6">
          {/* Back — icon-only on mobile, full label on desktop */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </button>
            <span className="hidden sm:inline text-foreground/30 text-sm">/</span>
            <span className="hidden sm:inline text-sm text-foreground/70">Card</span>
          </div>

          {/* Timewell — absolutely centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-serif text-xl sm:text-2xl font-normal text-foreground tracking-wide">Timewell</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {card && (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center text-sm h-9 px-4 rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground/80"
              >
                View Message Page
              </a>
            )}

            {/* Share button + dropdown panel — desktop only */}
            <div ref={shareRef} className="relative hidden md:block">
              <button
                onClick={() => setShowShare((v) => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground/70"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {showShare && card && (
                <>
                  {/* Mobile backdrop */}
                  <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowShare(false)} />

                  <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl md:absolute md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-[342px] md:rounded-xl bg-card border border-border shadow-xl p-5 space-y-4">
                    {/* Drag handle — mobile only */}
                    <div className="flex justify-center -mt-1 mb-1 md:hidden">
                      <div className="w-10 h-1 rounded-full bg-border" />
                    </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-[26px] font-normal text-foreground leading-tight">Share this Card</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Send this link for others to view and add videos, photos and recordings to the Message Page.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Message Page Link</p>
                      <p className="text-sm text-foreground truncate">{fullShareUrl}</p>
                    </div>
                    <button
                      onClick={copyLink}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy link"
                    >
                      {copied
                        ? <Check className="w-4 h-4 text-primary" />
                        : <Copy className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  <div className="space-y-2">
                    {isOrdered ? (
                      <div className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-muted text-sm text-muted-foreground">
                        <PackageCheck className="w-4 h-4" />
                        Order submitted
                      </div>
                    ) : (
                      <Button className="w-full h-11 text-sm font-medium" onClick={openOrderDialog}>
                        Submit order for print
                      </Button>
                    )}
                    {card.coverImage?.web && (
                      <a
                        href={card.coverImage.web}
                        download={`card-${card.shareToken}.jpg`}
                        className="w-full h-11 flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        Download Card Image
                      </a>
                    )}
                    {card.printBundle?.qrPngKey ? (
                      <a
                        href={card.printBundle.qrPngKey}
                        download={`qr-${card.shareToken}.png`}
                        className="w-full h-11 flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        Download QR Code
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-11 text-sm font-medium"
                        onClick={async () => {
                          const { getAccessToken } = await import("@/lib/authStore");
                          const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
                          const res = await fetch(`${apiBase}/api/cards/${card.id}/qr`, {
                            headers: { Authorization: `Bearer ${getAccessToken()}` },
                          });
                          if (!res.ok) return;
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `qr-${card.shareToken}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download QR Code
                      </Button>
                    )}
                  </div>
                  </div>
                </>
              )}
            </div>

            <Button disabled={!card || isOrdered} onClick={openOrderDialog}>
              {isOrdered ? "Ordered" : "Order"}
            </Button>
          </div>
        </div>
      </header>

      {showOrderDialog && card && (
        <SubmitOrderDialog
          cardId={card.id}
          onSuccess={handleOrderSuccess}
          onClose={() => setShowOrderDialog(false)}
        />
      )}
    </>
  );
}

// ── Brand icons ───────────────────────────────────────────────────────────────

function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="23" height="20" viewBox="0 0 23 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.3748 0.75H7.37476L0.874756 12.75L4.87476 18.75H18.3748L21.8748 12.75L15.3748 0.75Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M21.8748 12.75H8.06226" stroke="#485744" strokeWidth="1.5"/>
      <path d="M8.37476 0.75L15.3748 12.75" stroke="#485744" strokeWidth="1.5"/>
      <path d="M4.87476 18.75L11.4373 6.5" stroke="#485744" strokeWidth="1.5"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.75 0.75H20.75V20.75H0.75V0.75Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M10.75 15.25C13.2353 15.25 15.25 13.2353 15.25 10.75C15.25 8.26472 13.2353 6.25 10.75 6.25C8.26472 6.25 6.25 8.26472 6.25 10.75C6.25 13.2353 8.26472 15.25 10.75 15.25Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M16.25 4.25H16.75V4.75H16.25V4.25Z" stroke="#485744" strokeWidth="1.5"/>
    </svg>
  );
}

function DropboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 13.5L7 10L12 13.5L7 17L2 13.5Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M7.625 18.9375L12 22L16.375 18.9375" stroke="#485744" strokeWidth="1.5"/>
      <path d="M2 6.5L7 3L12 6.5L7 10L2 6.5Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M12 13.5L17 10L22 13.5L17 17L12 13.5Z" stroke="#485744" strokeWidth="1.5"/>
      <path d="M12 6.5L17 3L22 6.5L17 10L12 6.5Z" stroke="#485744" strokeWidth="1.5"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="22" viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.25 20.75V12.75H0.75V8.75H3.25V4.75C3.25 2.54086 5.0409 0.75 7.25 0.75H12.75V5.75H8.25V8.75H10.75V12.75H8.25V20.75H3.25Z" stroke="#485744" strokeWidth="1.5"/>
    </svg>
  );
}

// ── Upload panel (no cover yet) ───────────────────────────────────────────────

type UrlService = "google-drive" | "dropbox" | "instagram" | "facebook";

const SERVICE_HINTS: Record<UrlService, { title: string; steps: string[] }> = {
  "google-drive": {
    title: "Import from Google Drive",
    steps: [
      "Open Google Drive and find your photo.",
      "Right-click the file → Share → change access to \"Anyone with the link\".",
      "Click \"Copy link\" and paste it below.",
    ],
  },
  dropbox: {
    title: "Import from Dropbox",
    steps: [
      "Open Dropbox and find your photo.",
      "Hover the file → click \"Share\" → \"Copy link\".",
      "Paste the link below (we handle the rest).",
    ],
  },
  instagram: {
    title: "Import from Instagram",
    steps: [
      "Open Instagram in your browser and find the photo.",
      "Right-click the photo → \"Copy image address\".",
      "Paste the address below.",
    ],
  },
  facebook: {
    title: "Import from Facebook",
    steps: [
      "Open Facebook in your browser and find the photo.",
      "Right-click the photo → \"Copy image address\".",
      "Paste the address below.",
    ],
  },
};

// Normalize sharing URLs into direct-download URLs where possible.
function normalizeUrl(raw: string): string {
  try {
    // Google Drive: /file/d/FILE_ID/... → direct download
    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    // Dropbox sharing page: change dl=0 → dl=1
    if (/dropbox\.com/.test(raw)) {
      return raw.replace(/[?&]dl=0/, (m) => m.replace("dl=0", "dl=1"))
                .replace(/dropbox\.com\/scl\/fi\//, "dl.dropboxusercontent.com/scl/fi/");
    }
  } catch { /* fall through */ }
  return raw;
}

function UploadPanel({ cardId, onUploaded }: { cardId: string; onUploaded: (c: Card) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlService, setUrlService] = useState<UrlService | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");

  async function uploadFile(file: File) {
    setLoading(true); setError("");
    try {
      const updated = await cardsApi.uploadCover(cardId, file);
      onUploaded(updated);
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function uploadFromUrl(raw: string) {
    setLoading(true); setError("");
    try {
      const updated = await cardsApi.uploadCoverFromUrl(cardId, normalizeUrl(raw));
      onUploaded(updated);
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  function toggleService(svc: UrlService) {
    setUrlService((cur) => (cur === svc ? null : svc));
    setPastedUrl("");
    setError("");
  }

  function handleImport() {
    const url = pastedUrl.trim();
    if (!url) return;
    setUrlService(null);
    uploadFromUrl(url);
  }

  const btnCls = "w-12 h-12 shrink-0 aspect-square bg-muted rounded flex items-center justify-center text-foreground/50 hover:bg-muted/70 hover:text-foreground/80 transition-colors";
  const hint = urlService ? SERVICE_HINTS[urlService] : null;

  return (
    <>
      {/* Service URL dialog */}
      {urlService && hint && (
        <Dialog open onOpenChange={() => { setUrlService(null); setPastedUrl(""); setError(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{hint.title}</DialogTitle>
            </DialogHeader>
            <ol className="space-y-2 pl-4 py-1">
              {hint.steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground list-decimal leading-relaxed">{step}</li>
              ))}
            </ol>
            <div className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="Paste link here…"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleImport(); }}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <Button disabled={!pastedUrl.trim()} onClick={handleImport}>
                Import
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogContent>
        </Dialog>
      )}

      {/* Upload panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-muted border-t-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-7 py-8 w-full max-w-[340px] text-center space-y-5">
            <div className="space-y-2">
              <h2 className="font-serif text-4xl font-normal text-foreground">Upload Photo</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Select a photo to print on the card.
              </p>
            </div>

            <Button className="w-full h-12 text-base font-medium rounded-lg" onClick={() => inputRef.current?.click()}>
              Select Photo
            </Button>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Or, add from another service</p>
              <div className="flex items-center justify-center gap-3">
                <button type="button" title="Google Drive" onClick={() => toggleService("google-drive")} className={btnCls}>
                  <DriveIcon className="w-5 h-5" />
                </button>
                <button type="button" title="Instagram" onClick={() => toggleService("instagram")} className={btnCls}>
                  <InstagramIcon className="w-5 h-5" />
                </button>
                <button type="button" title="Dropbox" onClick={() => toggleService("dropbox")} className={btnCls}>
                  <DropboxIcon className="w-5 h-5" />
                </button>
                <button type="button" title="Facebook" onClick={() => toggleService("facebook")} className={btnCls}>
                  <FacebookIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/heic,image/webp" className="hidden" onChange={handleFile} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Card preview ──────────────────────────────────────────────────────────────

function CardPreview({
  card, side, title, message, orientation: orientationProp,
}: {
  card: Card; side: Side; title: string; message: string; orientation?: "landscape" | "portrait";
}) {
  const isPortrait = (orientationProp ?? card.orientation) === "portrait";
  const coverUrl = card.coverImage.web ?? card.coverImage.original ?? "";
  const shareUrl = card.shareToken ? `tw.life/${card.shareToken}` : "tw.life/…";

  const cardCn = cn(
    "bg-white rounded-2xl shadow-sm border-2 border-gray-300 mx-auto w-full overflow-hidden",
    isPortrait ? "max-w-[408px]" : "max-w-[600px]"
  );
  const cardRatio = isPortrait ? "3/4" : "4/3";

  if (side === "front") {
    if (isPortrait) {
      // White card: 3/4 aspect ratio (height:width = 4:3).
      // Inner image: same 3/4 ratio, 10% smaller in each dimension.
      // inset 4.55% = (1 - 1/1.1) / 2 on all sides; because top/bottom % resolve
      // against height and left/right against width, the inner box stays 3/4.
      return (
        <div
          className="bg-white rounded-2xl shadow-sm border-2 border-gray-300 mx-auto w-full max-w-[408px] relative"
          style={{ aspectRatio: "3/4" }}
        >
          <div className="absolute overflow-hidden rounded-xl" style={{ inset: "4.55%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Card cover" className="w-full h-full object-cover block" />
          </div>
        </div>
      );
    }
    return (
      <div className={cardCn} style={{ aspectRatio: cardRatio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="Card cover" className="w-full h-full object-cover block" />
      </div>
    );
  }

  return (
    <div className={cardCn} style={{ aspectRatio: cardRatio }}>
      <div className="flex flex-col h-full px-6 py-6">
        {/* Title + message — near the top */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          {title
            ? <p className="font-serif text-2xl font-normal leading-tight text-gray-900">{title}</p>
            : <p className="font-serif text-2xl font-normal text-gray-200">Your title</p>
          }
          {message && (
            <p className="text-xs text-gray-500 leading-relaxed max-w-[85%]">{message}</p>
          )}
        </div>

        {/* Spacer pushes footer to bottom */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="w-full flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-[10px] text-gray-400 tracking-wide">{shareUrl}</span>
          <span className="font-serif text-xs text-gray-700 tracking-wide">Timewell</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CardDetailPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: card, isLoading, error } = useQuery({
    queryKey: ["card", id],
    queryFn: () => cardsApi.get(id),
  });

  // UI state
  const [tab, setTab] = useState<Tab>("image");
  const [side, setSide] = useState<Side>("front");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileShare, setShowMobileShare] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [previewSide, setPreviewSide] = useState<Side>("front");

  // Image tab
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");

  // Message tab
  const [title, setTitle] = useState("");
  const [cardMessage, setCardMessage] = useState("");

  // Sharing tab
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [allowContributions, setAllowContributions] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Hydrate from loaded card
  useEffect(() => {
    if (!card) return;
    setOrientation(card.orientation ?? "landscape");
    setTitle(card.title ?? "");
    setCardMessage(card.message ?? "");
    setPasswordProtected(card.settings?.passwordProtected ?? false);
    setAllowContributions(card.settings?.allowContributions ?? true);
  }, [card]);

  function handleCoverUpdated(updated: Card) {
    queryClient.setQueryData(["card", id], updated);
    setOrientation(updated.orientation ?? orientation);
  }

  async function handleOrientationChange(val: "landscape" | "portrait") {
    setOrientation(val);
    try {
      const updated = await cardsApi.update(id, { orientation: val });
      queryClient.setQueryData(["card", id], updated);
    } catch { /* ignore — local state already updated */ }
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverLoading(true); setCoverError("");
    try {
      const updated = await cardsApi.uploadCover(id, file);
      handleCoverUpdated(updated);
    } catch (err) {
      setCoverError(getFriendlyMessage(err));
    } finally {
      setCoverLoading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleNext() {
    setSaving(true); setSaveError("");
    try {
      if (tab === "image") {
        setTab("message");
        setSide("back");
      } else if (tab === "message") {
        const updated = await cardsApi.update(id, {
          title: title.trim() || undefined,
          message: cardMessage.trim() || undefined,
        });
        queryClient.setQueryData(["card", id], updated);
        setTab("sharing");
        setSide("front");
      } else if (tab === "sharing") {
        const settings: { passwordProtected: boolean; allowContributions: boolean; password?: string } = {
          passwordProtected,
          allowContributions,
        };
        if (passwordProtected && password.length >= 4) settings.password = password;
        await cardsApi.update(id, { settings });
        queryClient.invalidateQueries({ queryKey: ["cards"] });
        router.push("/dashboard");
      }
    } catch (err) {
      setSaveError(getFriendlyMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (tab === "image") router.push("/dashboard");
    else if (tab === "message") { setTab("image"); setSide("front"); }
    else if (tab === "sharing") { setTab("message"); setSide("back"); }
  }

  async function handleDelete() {
    if (!confirm("Delete this card? This cannot be undone.")) return;
    await cardsApi.remove(id);
    queryClient.invalidateQueries({ queryKey: ["cards"] });
    router.replace("/dashboard");
  }

  const hasCover = Boolean(card?.coverImage?.original);

  // ── Loading ──────────────────────────────────────────────────────────────
  function handleCardUpdate(updated: Card) {
    queryClient.setQueryData(["card", id], updated);
    queryClient.invalidateQueries({ queryKey: ["cards"] });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <EditorHeader onBack={() => router.push("/dashboard")} card={null} onCardUpdate={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-muted border-t-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <EditorHeader onBack={() => router.push("/dashboard")} card={null} onCardUpdate={() => {}} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Card not found.</p>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EditorHeader onBack={() => router.push("/dashboard")} card={card} onCardUpdate={handleCardUpdate} onPreview={() => { setPreviewSide("front"); setShowMobilePreview(true); }} />

      {!hasCover ? (
        <UploadPanel cardId={id} onUploaded={handleCoverUpdated} />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* ── Left panel ── */}
          <div className="w-full md:w-[380px] md:shrink-0 border-b md:border-b-0 md:border-r bg-card flex flex-col">
            {/* Back / Next — opposite ends */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <Button variant="outline" className="px-8" onClick={handleBack}>
                Back
              </Button>
              {saveError && <p className="text-xs text-destructive truncate px-2">{saveError}</p>}
              <Button className="px-8" onClick={handleNext} disabled={saving}>
                {saving ? "Saving…" : tab === "sharing" ? "Done" : "Next"}
              </Button>
            </div>

            {/* Tab headers — left-aligned with gaps */}
            <div className="flex items-end gap-6 px-5 border-b">
              {(["image", "message", "sharing"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setSide(t === "message" ? "back" : "front");
                  }}
                  className={cn(
                    "py-3 text-base font-medium capitalize transition-colors shrink-0",
                    tab === t
                      ? "text-foreground border-b-2 border-foreground -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "image" ? "Image" : t === "message" ? "Message" : "Sharing"}
                </button>
              ))}
              {/* Share icon — mobile only, right of Sharing tab */}
              {card && (
                <button
                  onClick={() => setShowMobileShare(true)}
                  className="md:hidden ml-auto mb-2.5 h-7 w-7 flex items-center justify-center rounded-md border border-border bg-background text-foreground/70 hover:bg-muted transition-colors shrink-0"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 px-5 py-4 space-y-4">

              {/* ── Image tab ── */}
              {tab === "image" && (
                <>
                  {/* Heading — large serif, regular weight */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-4xl font-normal text-foreground leading-tight">Cover Image</p>
                      <button
                        onClick={() => { setPreviewSide("front"); setShowMobilePreview(true); }}
                        className="md:hidden flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground border border-border rounded-md px-3 h-8 transition-colors bg-background shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    </div>
                    <p className="text-sm text-foreground/80">Adjust orientation and cropping.</p>
                  </div>

                  {/* Orientation segmented control */}
                  <div className="flex rounded-xl border border-border overflow-hidden">
                    {(["landscape", "portrait"] as const).map((o, i) => (
                      <button
                        key={o}
                        onClick={() => handleOrientationChange(o)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 py-3 text-sm transition-colors",
                          i > 0 && "border-l border-border",
                          orientation === o
                            ? "bg-muted text-foreground font-medium"
                            : "bg-card text-foreground/70 hover:bg-muted/40"
                        )}
                      >
                        {/* Rectangle icon proportioned to orientation */}
                        <span className={cn(
                          "inline-block border-[1.5px] rounded-[1px] shrink-0",
                          o === "landscape" ? "w-[18px] h-[13px]" : "w-[13px] h-[18px]",
                          orientation === o ? "border-foreground" : "border-foreground/40"
                        )} />
                        <span className="capitalize">{o}</span>
                      </button>
                    ))}
                  </div>

                  {/* Thumbnail — uses web composite (QR baked in) */}
                  <div className="border border-border bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.coverImage.web ?? card.coverImage.original ?? ""}
                      alt="Thumbnail"
                      className="w-full block object-cover"
                      style={{ aspectRatio: orientation === "portrait" ? "3/4" : "4/3" }}
                    />
                  </div>

                  {coverError && <p className="text-xs text-destructive">{coverError}</p>}

                  {/* Replace Photo — centered, wide */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      className="px-10"
                      disabled={coverLoading}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverLoading ? "Uploading…" : "Replace Photo"}
                    </Button>
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic"
                    className="hidden"
                    onChange={handleCoverFile}
                  />
                </>
              )}

              {/* ── Message tab ── */}
              {tab === "message" && (
                <>
                  {/* Heading — same serif style as Cover Image */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-4xl font-normal text-foreground leading-tight">Text</p>
                      <button
                        onClick={() => { setPreviewSide("back"); setShowMobilePreview(true); }}
                        className="md:hidden flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground border border-border rounded-md px-3 h-8 transition-colors bg-background shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Add a brief message that will be on the back of the card and Message Page, or you can choose to leave this blank.
                    </p>
                  </div>

                  {/* Title — floating label field */}
                  <div className="bg-muted/50 rounded-lg px-4 pt-2.5 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">Title ({title.length}/40)</p>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Happy Birthday!"
                      maxLength={40}
                      className="w-full bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                  </div>

                  {/* Message — floating label textarea, green border on focus */}
                  <div className="bg-muted/50 rounded-lg px-4 pt-2.5 pb-3 border border-transparent focus-within:border-primary transition-colors">
                    <p className="text-xs text-muted-foreground mb-2">Message ({cardMessage.length}/80)</p>
                    <textarea
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value)}
                      placeholder="We love you, Grandpa"
                      maxLength={80}
                      rows={5}
                      className="w-full bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* ── Sharing tab ── */}
              {tab === "sharing" && (
                <div className="space-y-6">
                  {/* Heading */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-3xl font-normal text-foreground leading-tight">Settings</p>
                      <button
                        onClick={() => { setPreviewSide("front"); setShowMobilePreview(true); }}
                        className="md:hidden flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground border border-border rounded-md px-3 h-8 transition-colors bg-background shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Manage who can view and contribute content on the Message Page
                    </p>
                    <a
                      href={`/message/${card.shareToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-foreground underline inline-block mt-1"
                    >
                      (Preview Message Page in new tab.)
                    </a>
                  </div>

                  {/* Password protect */}
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      Password Protect Message Page
                    </p>
                    <div className="flex items-center gap-3">
                      <Toggle checked={passwordProtected} onChange={setPasswordProtected} />
                      <span className="text-sm text-foreground/80">{passwordProtected ? "On" : "Off"}</span>
                    </div>
                    {passwordProtected && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-muted-foreground">Password</p>
                        <Input
                          type="text"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 4 characters"
                          maxLength={128}
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Allow contributions */}
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      Allow Others to Upload Content
                    </p>
                    <div className="flex items-center gap-3">
                      <Toggle checked={allowContributions} onChange={setAllowContributions} />
                      <span className="text-sm text-foreground/80">{allowContributions ? "On" : "Off"}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-sm text-destructive hover:opacity-80 transition-opacity pt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete this card
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: preview — hidden on mobile ── */}
          <div className="hidden md:flex flex-1 flex-col items-center bg-muted/20 overflow-hidden">
            {/* Front / Back toggle */}
            <div className={cn(orientation === "portrait" ? "pt-3 pb-3" : "pt-6 pb-4")}>
              <div className="flex items-center border border-border rounded-md overflow-hidden text-xs">
                {(["front", "back"] as const).map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={cn(
                      "px-4 py-1.5 capitalize transition-colors",
                      i > 0 && "border-l border-border",
                      side === s
                        ? "bg-foreground text-background"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className={cn("flex-1 flex justify-center px-8 pb-8 w-full", orientation === "portrait" ? "items-start" : "items-center")}>
              <CardPreview card={card} side={side} title={title} message={cardMessage} orientation={orientation} />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile share bottom sheet ── */}
      {showMobileShare && card && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileShare(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border border-border shadow-xl p-5 space-y-4 md:hidden">
            <div className="flex justify-center -mt-1 mb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-[26px] font-normal text-foreground leading-tight">Share this Card</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Send this link for others to view and add videos, photos and recordings to the Message Page.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Message Page Link</p>
                <p className="text-sm text-foreground truncate">
                  {typeof window !== "undefined" ? window.location.origin : ""}/message/{card.shareToken}
                </p>
              </div>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/message/${card.shareToken}`;
                  await navigator.clipboard.writeText(url);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedShare ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {card.coverImage?.web && (
              <a
                href={card.coverImage.web}
                download={`card-${card.shareToken}.jpg`}
                className="w-full h-11 flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Download Card Image
              </a>
            )}
            {card.printBundle?.qrPngKey && (
              <a
                href={card.printBundle.qrPngKey}
                download={`qr-${card.shareToken}.png`}
                className="w-full h-11 flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Download QR Code
              </a>
            )}
          </div>
        </>
      )}

      {/* ── Mobile card preview bottom sheet ── */}
      {showMobilePreview && card && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end sm:hidden"
          onClick={() => setShowMobilePreview(false)}
        >
          <div
            className="bg-background rounded-t-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="font-serif text-xl font-normal text-foreground">Card Preview</span>
              <button onClick={() => setShowMobilePreview(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center pt-4 pb-2">
              <div className="flex items-center border border-border rounded-md overflow-hidden text-xs">
                {(["front", "back"] as const).map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setPreviewSide(s)}
                    className={cn(
                      "px-5 py-1.5 capitalize transition-colors",
                      i > 0 && "border-l border-border",
                      previewSide === s ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 pb-8 pt-3 flex justify-center">
              <CardPreview card={card} side={previewSide} title={title} message={cardMessage} orientation={orientation} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
