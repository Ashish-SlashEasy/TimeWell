"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cardsApi, type Card } from "@/lib/cards";
import { CoverUpload } from "@/components/cards/CoverUpload";
import { ImageTab } from "@/components/cards/ImageTab";
import { MessageTab } from "@/components/cards/MessageTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<Card["status"], string> = {
  draft: "Draft",
  in_progress: "In progress",
  ordered: "Ordered",
  archived: "Archived",
  deleted: "Deleted",
};

interface Props {
  params: { id: string };
}

export default function CardDetailPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: card, isLoading, error } = useQuery({
    queryKey: ["card", id],
    queryFn: () => cardsApi.get(id),
  });

  function handleCoverUpdated(updated: Card) {
    queryClient.setQueryData(["card", id], updated);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Card not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">← Back</Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{card.title ?? "Untitled card"}</p>
          </div>
          <Badge variant="secondary">{STATUS_LABELS[card.status]}</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          {/* Left: cover */}
          <div className="space-y-4">
            <CoverUpload card={card} onUpdated={handleCoverUpdated} />
            {card.title && (
              <div>
                <p className="font-serif text-2xl font-semibold">{card.title}</p>
                {card.message && <p className="text-sm text-muted-foreground mt-1">{card.message}</p>}
              </div>
            )}
          </div>

          {/* Right: tabs */}
          <div>
            <Tabs defaultValue="images">
              <TabsList className="mb-4">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>
              <TabsContent value="images">
                <ImageTab cardId={id} />
              </TabsContent>
              <TabsContent value="messages">
                <MessageTab cardId={id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
