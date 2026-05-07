"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { cardsApi } from "@/lib/cards";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// ── Service hints ─────────────────────────────────────────────────────────────

type UrlService = "google-drive" | "instagram" | "dropbox" | "facebook";

const SERVICE_HINTS: Record<UrlService, { title: string; steps: string[] }> = {
  "google-drive": {
    title: "Import from Google Drive",
    steps: [
      "Open Google Drive and find your photo.",
      "Right-click the file → \"Share\" → change access to \"Anyone with the link\".",
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

const SERVICE_BUTTONS: { svc: UrlService; Icon: React.FC<{ className?: string }> }[] = [
  { svc: "google-drive", Icon: DriveIcon },
  { svc: "instagram", Icon: InstagramIcon },
  { svc: "dropbox", Icon: DropboxIcon },
  { svc: "facebook", Icon: FacebookIcon },
];

// Normalize sharing URLs into direct-download URLs where possible.
function normalizeUrl(raw: string): string {
  try {
    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    if (/dropbox\.com/.test(raw)) {
      return raw.replace(/[?&]dl=0/, (m) => m.replace("dl=0", "dl=1"))
                .replace(/dropbox\.com\/scl\/fi\//, "dl.dropboxusercontent.com/scl/fi/");
    }
  } catch { /* fall through */ }
  return raw;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewCardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlService, setUrlService] = useState<UrlService | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");

  function toggleService(svc: UrlService) {
    setUrlService((cur) => (cur === svc ? null : svc));
    setPastedUrl("");
    setError("");
  }

  function closeDialog() {
    setUrlService(null);
    setPastedUrl("");
    setError("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const card = await cardsApi.create({ orientation: "landscape" });
      await cardsApi.uploadCover(card.id, file);
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
      router.push(`/cards/${card.id}`);
    } catch (err) {
      setError(getFriendlyMessage(err));
      setLoading(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleImport() {
    const url = pastedUrl.trim();
    if (!url) return;
    setUrlService(null);
    setLoading(true);
    setError("");
    try {
      const card = await cardsApi.create({ orientation: "landscape" });
      await cardsApi.uploadCoverFromUrl(card.id, normalizeUrl(url));
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
      router.push(`/cards/${card.id}`);
    } catch (err) {
      setError(getFriendlyMessage(err));
      setLoading(false);
    }
  }

  const hint = urlService ? SERVICE_HINTS[urlService] : null;
  const btnCls = "w-12 h-12 shrink-0 aspect-square bg-muted rounded flex items-center justify-center text-foreground/50 hover:bg-muted/70 hover:text-foreground/80 transition-colors";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="h-[72px] relative flex items-center px-4 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <span className="text-foreground/30 text-sm">/</span>
            <span className="text-sm text-foreground/60">Card</span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-serif text-[26px] font-normal text-foreground tracking-wide">Timewell</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <button
              onClick={() => inputRef.current?.click()}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground/60"
              disabled={loading}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <Button disabled>Order</Button>
          </div>
        </div>
      </header>

      {/* Service URL dialog */}
      {urlService && hint && (
        <Dialog open onOpenChange={closeDialog}>
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full h-12 text-base font-medium rounded-lg"
              onClick={() => inputRef.current?.click()}
            >
              Select Photo
            </Button>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Or, add from another service</p>
              <div className="flex items-center justify-center gap-3">
                {SERVICE_BUTTONS.map(({ svc, Icon }) => (
                  <button
                    key={svc}
                    type="button"
                    title={svc}
                    onClick={() => toggleService(svc)}
                    className={btnCls}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/webp"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
