"use client";

import { useState, useCallback } from "react";

interface ToastState {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  open: boolean;
}

let count = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
    }: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      const id = String(++count);
      setToasts((prev) => [...prev, { id, title, description, variant, open: true }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
