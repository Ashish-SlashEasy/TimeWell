"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/authStore";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-14 md:pb-0">{children}</div>
    </div>
  );
}
