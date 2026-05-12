"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, getFriendlyMessage } from "@/lib/api";
import { cardsApi, type Card } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactDialog } from "@/components/ContactDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Quota {
  total: number;
  used: number;
  remaining: number;
}

interface CtxState {
  x: number;
  y: number;
  cardId: string;
}

// ── Context menu ──────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, onArchive, onDelete, onClose,
}: {
  x: number; y: number;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    setPos({
      top: Math.min(y, window.innerHeight - h - 8),
      left: Math.min(x, window.innerWidth - w - 8),
    });
  }, [x, y]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[152px] text-sm"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onArchive} className="w-full text-left px-4 py-2 hover:bg-muted transition-colors">
          Archive
        </button>
        <div className="border-t border-border my-1" />
        <button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-muted text-destructive transition-colors">
          Delete
        </button>
      </div>
    </>
  );
}

// ── Long-press + right-click wrapper ─────────────────────────────────────────

function CardContextTrigger({
  cardId, onMenu, children,
}: {
  cardId: string;
  onMenu: (x: number, y: number, cardId: string) => void;
  children: React.ReactNode;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancel() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); onMenu(e.clientX, e.clientY, cardId); }}
      onPointerDown={(e) => {
        timerRef.current = setTimeout(() => onMenu(e.clientX, e.clientY, cardId), 500);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    >
      {children}
    </div>
  );
}

// ── Card sub-components ───────────────────────────────────────────────────────

function CardThumb({ card }: { card: Card }) {
  const img = card.coverImage?.thumb ?? card.coverImage?.web ?? card.coverImage?.original;

  return (
    <div className="relative shrink-0 w-[130px] h-[100px] shadow-md rounded-sm overflow-hidden bg-muted">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={card.title ?? ""} className="w-full h-full object-cover block" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sm font-serif text-muted-foreground select-none">
            {card.title ? card.title[0].toUpperCase() : "?"}
          </span>
        </div>
      )}
    </div>
  );
}

function InProgressCard({ card, onEdit }: { card: Card; onEdit: () => void }) {
  return (
    <div className="flex items-center md:items-start gap-4 sm:gap-6 bg-muted/40 rounded-2xl px-4 sm:px-6 py-[22px] md:py-4">
      <CardThumb card={card} />
      <div className="flex-1 min-w-0 flex flex-col justify-between h-[143px] md:h-[110px] py-1">
        <div className="space-y-1">
          <p className="font-serif text-[22px] font-bold leading-snug text-foreground">
            {card.title ?? "Untitled card"}
          </p>
          <p className="text-sm text-muted-foreground">In progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </div>
  );
}

function OrderedCell({ card, onReview }: { card: Card; onReview: () => void }) {
  const ordered = new Date(card.orderedAt ?? card.updatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <div className="flex items-center md:items-start gap-4 sm:gap-6 bg-muted/40 rounded-2xl px-4 sm:px-6 py-[22px] md:py-4">
      <CardThumb card={card} />
      <div className="flex-1 min-w-0 flex flex-col justify-between h-[143px] md:h-[110px] py-1">
        <div className="space-y-1">
          <p className="font-serif text-[22px] font-bold leading-snug text-foreground">
            {card.title ?? "Untitled card"}
          </p>
          <p className="text-sm text-muted-foreground">Ordered {ordered}</p>
        </div>
        <div>
          <Button variant="outline" onClick={onReview}>Review</Button>
        </div>
      </div>
    </div>
  );
}

function QuestionsBlock({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="bg-muted/40 rounded-2xl px-5 sm:px-8 py-8 sm:py-10 text-center space-y-4">
      <h3 className="font-serif text-2xl text-foreground">Have questions?</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Please browse through our setup guides or reach out to our support team.
        We&apos;re happy you&apos;re here and are happy to help!
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button onClick={() => window.location.href = "/help"}>Browse Resources</Button>
        <Button variant="outline" onClick={onAsk}>Ask Us a Question</Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 4;

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [orderedPage, setOrderedPage] = useState(1);
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showContact, setShowContact] = useState(false);

  const { data: allCards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: cardsApi.list,
  });

  const { data: quota } = useQuery<Quota>({
    queryKey: ["quota"],
    queryFn: () => api.get<{ data: Quota }>("/users/me/quota").then((r) => r.data.data),
    retry: false,
  });

  const inProgress = allCards.filter(
    (c) => (c.status === "draft" || c.status === "in_progress") && c.coverImage?.original,
  );
  const ordered = allCards.filter((c) => c.status === "ordered");
  const orderedVisible = ordered.slice(0, orderedPage * PAGE_SIZE);
  const hasMore = ordered.length > orderedVisible.length;
  const quotaExhausted = quota ? quota.remaining <= 0 : false;

  function openMenu(x: number, y: number, cardId: string) {
    setActionError("");
    setCtxMenu({ x, y, cardId });
  }

  async function handleArchive(cardId: string) {
    setCtxMenu(null);
    try {
      await cardsApi.archive(cardId);
      queryClient.setQueryData(["cards"], (old: Card[] = []) => old.filter((c) => c.id !== cardId));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards"] }),
        queryClient.invalidateQueries({ queryKey: ["quota"] }),
      ]);
    } catch (err) {
      setActionError(getFriendlyMessage(err));
    }
  }

  function promptDelete(cardId: string) {
    setCtxMenu(null);
    setDeleteTarget(cardId);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget;
    try {
      await cardsApi.remove(id);
      queryClient.setQueryData(["cards"], (old: Card[] = []) => old.filter((c) => c.id !== id));
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards"] }),
        queryClient.invalidateQueries({ queryKey: ["quota"] }),
      ]);
    } catch (err) {
      setActionError(getFriendlyMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const isEmpty = inProgress.length === 0 && ordered.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <ContactDialog open={showContact} onClose={() => setShowContact(false)} />

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onArchive={() => handleArchive(ctxMenu.cardId)}
          onDelete={() => promptDelete(ctxMenu.cardId)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete card?</DialogTitle>
            <DialogDescription>This permanently deletes the card and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobile-only Timewell brand bar ── */}
      <header className="md:hidden h-12 flex items-center justify-center border-b border-border bg-background shrink-0">
        <span className="font-serif text-[22px] font-normal text-foreground tracking-wide">Timewell</span>
      </header>

      {/* ── Page header ── */}
      <div className="w-full px-4 sm:px-8 pt-4 md:pt-8 pb-4 md:flex md:flex-row md:items-center md:justify-between md:gap-3">
        {/* Title — always visible; New button shown inline on mobile only */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-foreground">Home</h1>
          <Button
            disabled={quotaExhausted}
            title={quotaExhausted ? "No cards available. Buy more?" : undefined}
            onClick={() => router.push("/cards/new")}
            className="md:hidden gap-2 px-5 h-9 text-sm font-medium shrink-0"
          >
            <span className="text-base leading-none">+</span> New
          </Button>
        </div>
        {/* Quota bar + New button (desktop: same row as title; mobile: below title) */}
        <div className="mt-3 md:mt-0 flex items-center gap-3 sm:gap-4">
          {isLoading ? (
            <div className="flex-1 md:w-52 h-7 bg-muted rounded animate-pulse" />
          ) : quota ? (
            <div className="flex flex-col gap-1 items-start flex-1 md:flex-none">
              <div className="w-full md:w-52 h-[7px] rounded-full bg-[#E0E0D6] overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (quota.used / quota.total) * 100)}%` }}
                />
              </div>
              <span className="text-[13px] text-foreground/70 whitespace-nowrap">
                You have {quota.remaining}/{quota.total} cards left to use.
              </span>
            </div>
          ) : null}
          <Button
            disabled={quotaExhausted}
            title={quotaExhausted ? "No cards available. Buy more?" : undefined}
            onClick={() => router.push("/cards/new")}
            className="hidden md:inline-flex gap-2 px-5 h-10 text-sm font-medium shrink-0"
          >
            <span className="text-base leading-none">+</span> New
          </Button>
        </div>
      </div>

      {/* Quota exhausted / near-limit banner */}
      {quota && quota.remaining <= 2 && (
        <div className="mx-4 sm:mx-8 mb-2 flex items-center justify-between gap-4 rounded-xl bg-muted/60 border border-border px-4 sm:px-5 py-3">
          <p className="text-sm text-foreground/80">
            {quota.remaining === 0
              ? "You've used all your card credits."
              : `You have ${quota.remaining} card credit${quota.remaining !== 1 ? "s" : ""} left.`}{" "}
            <span className="text-muted-foreground">Buy more?</span>
          </p>
          <Button size="sm" onClick={() => router.push("/buy")}>Buy Cards</Button>
        </div>
      )}

      {actionError && <p className="text-sm text-destructive px-8">{actionError}</p>}

      {isLoading ? (
        <div className="w-full px-4 sm:px-8 py-4 space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-[160px] bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : isEmpty ? (
        <>
          <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
            <div className="text-center space-y-4">
              <h2 className="font-serif text-xl text-foreground">Create a new card</h2>
              <Button
                disabled={quotaExhausted}
                title={quotaExhausted ? "No cards available. Buy more?" : undefined}
                onClick={() => router.push("/cards/new")}
              >
                Create Card
              </Button>
            </div>
          </main>
          <div className="px-4 sm:px-8 pb-10"><QuestionsBlock onAsk={() => setShowContact(true)} /></div>
        </>
      ) : (
        <>
          <main className="flex-1 w-full px-4 sm:px-8 py-4 space-y-8">
            {inProgress.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">In Progress</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inProgress.map((card) => (
                    <CardContextTrigger key={card.id} cardId={card.id} onMenu={openMenu}>
                      <InProgressCard card={card} onEdit={() => router.push(`/cards/${card.id}`)} />
                    </CardContextTrigger>
                  ))}
                </div>
              </section>
            )}

            {ordered.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ordered</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {orderedVisible.map((card) => (
                    <CardContextTrigger key={card.id} cardId={card.id} onMenu={openMenu}>
                      <OrderedCell card={card} onReview={() => router.push(`/cards/${card.id}`)} />
                    </CardContextTrigger>
                  ))}
                </div>
                {(hasMore || ordered.length > PAGE_SIZE) && (
                  <div className="flex items-center gap-3 pt-1">
                    {hasMore && (
                      <Button variant="outline" size="sm" onClick={() => setOrderedPage((p) => p + 1)}>
                        Load More
                      </Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {orderedVisible.length} of {ordered.length}
                    </span>
                  </div>
                )}
              </section>
            )}
          </main>

          <div className="w-full px-4 sm:px-8 pb-10"><QuestionsBlock onAsk={() => setShowContact(true)} /></div>
        </>
      )}
    </div>
  );
}
