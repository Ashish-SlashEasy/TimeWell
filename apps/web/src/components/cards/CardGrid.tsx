"use client";

import Link from "next/link";
import type { Card } from "@/lib/cards";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<Card["status"], string> = {
  draft: "Draft",
  in_progress: "In progress",
  ordered: "Ordered",
  archived: "Archived",
  deleted: "Deleted",
};

const STATUS_VARIANT: Record<Card["status"], "default" | "secondary" | "outline"> = {
  draft: "secondary",
  in_progress: "default",
  ordered: "default",
  archived: "outline",
  deleted: "outline",
};

function CardThumb({ card }: { card: Card }) {
  const thumb = card.coverImage?.thumb;
  return (
    <Link href={`/cards/${card.id}`} className="group block rounded-lg overflow-hidden border bg-card hover:shadow-md transition-shadow">
      <div
        className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={card.title ?? "Card cover"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-4xl font-serif text-muted-foreground select-none">
            {card.title ? card.title[0].toUpperCase() : "?"}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-medium text-sm truncate">{card.title ?? "Untitled card"}</p>
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[card.status]} className="text-xs">
            {STATUS_LABELS[card.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface Props {
  cards: Card[];
}

export function CardGrid({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <CardThumb key={card.id} card={card} />
      ))}
    </div>
  );
}
