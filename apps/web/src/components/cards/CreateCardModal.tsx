"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateCardSchema, type CreateCardInput } from "@timewell/shared";
import { cardsApi } from "@/lib/cards";
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

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (cardId: string) => void;
}

export function CreateCardModal({ open, onClose, onCreated }: Props) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCardInput>({ resolver: zodResolver(CreateCardSchema) });

  async function onSubmit(values: CreateCardInput) {
    setError("");
    try {
      const card = await cardsApi.create(values);
      reset();
      onCreated(card.id);
    } catch (e) {
      setError(getFriendlyMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Card title (optional)</Label>
            <Input id="title" placeholder="e.g. Happy Birthday, Mum" maxLength={40} {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="message">Personal message (optional)</Label>
            <Input id="message" placeholder="A short note on the cover" maxLength={80} {...register("message")} />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
