"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cardsApi } from "@/lib/cards";
import { clearAccessToken } from "@/lib/authStore";
import { api } from "@/lib/api";
import { CardGrid } from "@/components/cards/CardGrid";
import { CreateCardModal } from "@/components/cards/CreateCardModal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: cardsApi.list,
  });

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    clearAccessToken();
    queryClient.clear();
    router.replace("/signin");
  }

  function handleCardCreated(cardId: string) {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ["cards"] });
    router.push(`/cards/${cardId}`);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold">Timewell</span>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreate(true)} size="sm">
              + New card
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-semibold">Your cards</h1>
          <span className="text-sm text-muted-foreground">{cards.length} card{cards.length !== 1 ? "s" : ""}</span>
        </div>

        <Separator className="mb-6" />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card animate-pulse">
                <div className="aspect-[4/3] bg-muted rounded-t-lg" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl">🃏</p>
            <h2 className="text-xl font-serif font-medium">No cards yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Create your first memory card and start collecting photos and messages from friends.
            </p>
            <Button onClick={() => setShowCreate(true)}>Create your first card</Button>
          </div>
        ) : (
          <CardGrid cards={cards} />
        )}
      </main>

      <CreateCardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCardCreated}
      />
    </div>
  );
}
