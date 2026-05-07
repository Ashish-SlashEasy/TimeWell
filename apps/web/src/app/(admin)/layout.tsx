"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/authStore";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (decoded.role as string) ?? null;
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function ensureAdmin() {
      let token = getAccessToken();
      if (!token) {
        try {
          const res = await api.post<{ data: { accessToken: string } }>("/auth/refresh");
          token = res.data.data.accessToken;
          setAccessToken(token);
        } catch {
          clearAccessToken();
          router.replace("/login");
          return;
        }
      }
      if (decodeJwtRole(token) !== "admin") {
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    }
    ensureAdmin();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
