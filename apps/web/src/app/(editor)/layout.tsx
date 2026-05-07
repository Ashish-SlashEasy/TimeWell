"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/authStore";
import { api } from "@/lib/api";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    async function ensureAuth() {
      if (getAccessToken()) return;
      try {
        const res = await api.post<{ data: { accessToken: string } }>("/auth/refresh");
        setAccessToken(res.data.data.accessToken);
      } catch {
        clearAccessToken();
        router.replace("/login");
      }
    }
    ensureAuth();
  }, [router]);

  return <>{children}</>;
}
