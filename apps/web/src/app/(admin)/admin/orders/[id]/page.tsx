"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Truck, X, AlertTriangle, FileText } from "lucide-react";
import { adminApi, type OrderStatus, type Carrier, type AdminNote, type ActivityEntry } from "@/lib/admin";
import { getFriendlyMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  in_production: "secondary",
  shipped: "secondary",
  delivered: "default",
  cancelled: "destructive",
};

const CARRIER_LABELS: Record<Carrier, string> = {
  usps: "USPS",
  ups: "UPS",
  fedex: "FedEx",
  dhl: "DHL",
  other: "Other",
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtShortDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function adminNoteName(note: AdminNote): string {
  const a = note.adminId;
  if (typeof a === "string") return "Admin";
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || "Admin";
}

// ── Status transition helpers ──────────────────────────────────────────────
const STATUS_ORDER: OrderStatus[] = ["new", "in_production", "shipped", "delivered"];

function nextForwardStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

function canCancel(status: OrderStatus): boolean {
  return status !== "delivered" && status !== "cancelled";
}

// ── Shipped Dialog ─────────────────────────────────────────────────────────
function ShipDialog({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("usps");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateStatus(orderId, {
        status: "shipped",
        trackingNumber: tracking,
        carrier,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      onClose();
    },
    onError: (err) => setError(getFriendlyMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Shipped</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tracking Number</label>
            <Input
              placeholder="e.g. 9400111899223481567289"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as Carrier)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {(Object.keys(CARRIER_LABELS) as Carrier[]).map((c) => (
                <option key={c} value={c}>
                  {CARRIER_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!tracking.trim() || mutation.isPending}
          >
            <Truck className="w-4 h-4 mr-1.5" />
            {mutation.isPending ? "Saving…" : "Mark Shipped"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reason Dialog (for backward moves or cancel) ───────────────────────────
function ReasonDialog({
  orderId,
  toStatus,
  label,
  onClose,
}: {
  orderId: string;
  toStatus: OrderStatus;
  label: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const needsReason = toStatus === "cancelled" || true; // always require for dialog-driven flows

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateStatus(orderId, { status: toStatus, reason: reason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      onClose();
    },
    onError: (err) => setError(getFriendlyMessage(err)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {needsReason && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                placeholder="Add a note about this status change…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={toStatus === "cancelled" ? "destructive" : "default"}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [reasonDialog, setReasonDialog] = useState<{ toStatus: OrderStatus; label: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => adminApi.getOrder(id),
    enabled: Boolean(id),
  });

  const noteMutation = useMutation({
    mutationFn: () => adminApi.addNote(id, noteText),
    onSuccess: () => {
      setNoteText("");
      setNoteError("");
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
    },
    onError: (err) => setNoteError(getFriendlyMessage(err)),
  });

  const forwardMutation = useMutation({
    mutationFn: (toStatus: OrderStatus) => adminApi.updateStatus(id, { status: toStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
    },
  });

  async function handleDownload(fileType: "print" | "qr") {
    setDownloadError("");
    try {
      const { url } = await adminApi.getDownloadUrl(id, fileType);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileType === "print" ? `print-${id}.jpg` : `qr-${id}.png`;
      a.target = "_blank";
      a.click();
    } catch (err) {
      setDownloadError(getFriendlyMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <span className="text-sm text-muted-foreground">Loading order…</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Order not found.</p>
        <Link href="/admin/orders" className="text-sm text-muted-foreground underline mt-2 block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const nextStatus = nextForwardStatus(order.status);
  const owner = order.ownerId;
  const card = order.cardId;
  const addr = order.shippingAddress;

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Orders
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground font-mono tracking-wide">
              #{order._id.slice(-10).toUpperCase()}
            </h1>
            <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted {fmtShortDate(order.submittedAt ?? order.createdAt)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {nextStatus && nextStatus !== "shipped" && (
            <Button
              size="sm"
              onClick={() => forwardMutation.mutate(nextStatus)}
              disabled={forwardMutation.isPending}
            >
              Mark {STATUS_LABELS[nextStatus]}
            </Button>
          )}
          {nextStatus === "shipped" && (
            <Button size="sm" onClick={() => setShowShipDialog(true)}>
              <Truck className="w-4 h-4 mr-1.5" />
              Mark Shipped
            </Button>
          )}
          {canCancel(order.status) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setReasonDialog({ toStatus: "cancelled", label: "Cancel Order" })}
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — Customer Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Customer
          </h2>
          <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
            <div>
              <span className="font-medium text-foreground">
                {[owner.firstName, owner.lastName].filter(Boolean).join(" ") || "—"}
              </span>
            </div>
            {owner.email && (
              <div className="text-muted-foreground">{owner.email}</div>
            )}
            {owner.phone && (
              <div className="text-muted-foreground">{owner.phone}</div>
            )}

            <Separator />

            <div className="text-sm text-foreground font-medium">{addr.fullName}</div>
            <div className="text-muted-foreground">
              {addr.line1}
              {addr.line2 && <>, {addr.line2}</>}
            </div>
            <div className="text-muted-foreground">
              {addr.city}, {addr.state} {addr.postalCode}
            </div>
            <div className="text-muted-foreground">{addr.country}</div>
          </div>
        </div>

        {/* Centre — Card Preview */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Card Preview
          </h2>
          <div className="rounded-lg border bg-card p-4 space-y-3">
            {card.coverImage?.web || card.coverImage?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.coverImage.web ?? card.coverImage.thumb ?? ""}
                alt="Cover"
                className={`w-full rounded-md object-cover ${
                  card.orientation === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]"
                }`}
              />
            ) : (
              <div
                className={`w-full rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs ${
                  card.orientation === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]"
                }`}
              >
                No cover image
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{card.title ?? "Untitled"}</p>
              {card.message && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{card.message}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {card.orientation} · {card.shareToken}
            </div>
          </div>
        </div>

        {/* Right — Fulfillment */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Fulfillment
          </h2>
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Button
              className="w-full"
              onClick={() => handleDownload("print")}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download Print File (JPG)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleDownload("qr")}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download QR Code (PNG)
            </Button>
            {downloadError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {downloadError}
              </p>
            )}

            {order.trackingNumber && (
              <>
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
                    Tracking
                  </div>
                  <div className="font-mono text-foreground">{order.trackingNumber}</div>
                  {order.carrier && (
                    <div className="text-muted-foreground text-xs">
                      {CARRIER_LABELS[order.carrier]}
                    </div>
                  )}
                </div>
              </>
            )}

            {order.shippedAt && (
              <div className="text-xs text-muted-foreground">
                Shipped {fmtDate(order.shippedAt)}
              </div>
            )}
            {order.deliveredAt && (
              <div className="text-xs text-muted-foreground">
                Delivered {fmtDate(order.deliveredAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity Log */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Activity Log
          </h2>
          <div className="rounded-lg border bg-card divide-y text-sm">
            {!order.activityLog.length ? (
              <p className="px-4 py-6 text-muted-foreground text-xs text-center">
                No activity yet.
              </p>
            ) : (
              [...order.activityLog]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((entry: ActivityEntry, i) => (
                  <div key={i} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">
                        {entry.action.replace("_", " ")}
                        {entry.fromStatus && entry.toStatus
                          ? ` · ${STATUS_LABELS[entry.fromStatus as OrderStatus] ?? entry.fromStatus} → ${STATUS_LABELS[entry.toStatus as OrderStatus] ?? entry.toStatus}`
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(entry.timestamp)}
                      </span>
                    </div>
                    {entry.reason && (
                      <p className="text-xs text-muted-foreground italic">{entry.reason}</p>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Admin Notes */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Admin Notes
          </h2>
          <div className="rounded-lg border bg-card divide-y text-sm">
            {!order.adminNotes.length ? (
              <p className="px-4 py-6 text-muted-foreground text-xs text-center">
                No notes yet.
              </p>
            ) : (
              [...order.adminNotes]
                .sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((note: AdminNote) => (
                  <div key={note._id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-xs">
                        {adminNoteName(note)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{note.text}</p>
                  </div>
                ))
            )}
          </div>

          {/* Add note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add an internal note…"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            {noteError && <p className="text-xs text-destructive">{noteError}</p>}
            <Button
              size="sm"
              variant="outline"
              disabled={!noteText.trim() || noteMutation.isPending}
              onClick={() => noteMutation.mutate()}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {noteMutation.isPending ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showShipDialog && (
        <ShipDialog orderId={id} onClose={() => setShowShipDialog(false)} />
      )}
      {reasonDialog && (
        <ReasonDialog
          orderId={id}
          toStatus={reasonDialog.toStatus}
          label={reasonDialog.label}
          onClose={() => setReasonDialog(null)}
        />
      )}
    </div>
  );
}
