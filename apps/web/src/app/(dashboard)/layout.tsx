"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authStore";
import { api } from "@/lib/api";
import { setAccessToken, clearAccessToken } from "@/lib/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    async function ensureAuth() {
      if (getAccessToken()) return;
      // No in-memory token — try refresh cookie
      try {
        const res = await api.post<{ data: { accessToken: string } }>("/auth/refresh");
        setAccessToken(res.data.data.accessToken);
      } catch {
        clearAccessToken();
        router.replace("/signin");
      }
    }
    ensureAuth();
  }, [router]);

  return <>{children}</>;
}
