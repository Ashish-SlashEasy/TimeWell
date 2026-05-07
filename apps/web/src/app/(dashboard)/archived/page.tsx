"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriendlyMessage } from "@/lib/api";
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface CtxState { x: number; y: number; cardId: string }

// ── Context menu ──────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, onRestore, onDelete, onClose,
}: {
  x: number; y: number;
  onRestore: () => void;
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
        <button onClick={onRestore} className="w-full text-left px-4 py-2 hover:bg-muted transition-colors">
          Restore
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
      onPointerDown={(e) => { timerRef.current = setTimeout(() => onMenu(e.clientX, e.clientY, cardId), 500); }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    >
      {children}
    </div>
  );
}

// ── Card components ───────────────────────────────────────────────────────────

function CardThumb({ card }: { card: Card }) {
  const thumb = card.coverImage?.thumb;
  return (
    <div className="shrink-0 w-[100px] h-[130px] bg-white shadow-md overflow-hidden">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={card.title ?? ""} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <span className="text-xl font-serif text-muted-foreground select-none">
            {card.title ? card.title[0].toUpperCase() : "?"}
          </span>
        </div>
      )}
    </div>
  );
}

function ArchivedCard({ card, onRestore }: { card: Card; onRestore: () => void }) {
  const archived = new Date(card.updatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <div className="flex items-start gap-4 sm:gap-6 bg-muted/40 rounded-2xl px-4 sm:px-6 py-5 opacity-70">
      <CardThumb card={card} />
      <div className="flex-1 min-w-0 flex flex-col justify-between h-[130px] py-1">
        <div className="space-y-1">
          <p className="font-serif text-[22px] font-bold leading-snug text-foreground">
            {card.title ?? "Untitled card"}
          </p>
          <p className="text-sm text-muted-foreground">Archived {archived}</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={onRestore}>Restore</Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArchivedPage() {
  const queryClient = useQueryClient();
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const { data: archivedCards = [], isLoading } = useQuery({
    queryKey: ["cards", "archived"],
    queryFn: cardsApi.listArchived,
  });

  function openMenu(x: number, y: number, cardId: string) {
    setActionError("");
    setCtxMenu({ x, y, cardId });
  }

  async function handleRestore(cardId: string) {
    setCtxMenu(null);
    try {
      await cardsApi.restore(cardId);
      queryClient.invalidateQueries({ queryKey: ["cards"] });
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
    try {
      await cardsApi.remove(deleteTarget);
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      setDeleteTarget(null);
    } catch (err) {
      setActionError(getFriendlyMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onRestore={() => handleRestore(ctxMenu.cardId)}
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

      <main className="flex-1 w-full px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        <h1 className="font-serif text-3xl font-semibold text-foreground">Archived</h1>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-[160px] bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : archivedCards.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No archived cards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {archivedCards.map((card) => (
              <CardContextTrigger key={card.id} cardId={card.id} onMenu={openMenu}>
                <ArchivedCard card={card} onRestore={() => handleRestore(card.id)} />
              </CardContextTrigger>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
