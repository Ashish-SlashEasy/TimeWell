"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [{ href: "/admin/orders", label: "Orders", icon: Package }];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch { /* ignore */ }
    clearAccessToken();
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col min-h-screen border-r bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-5 border-b">
          <span className="font-serif text-xl font-semibold text-foreground">Timewell</span>
          <span className="ml-2 text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            Admin
          </span>
        </div>

        <nav className="flex-1 px-3 pt-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold text-foreground">Timewell</span>
          <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            Admin
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-14 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-md text-xs transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active && "stroke-[2.5]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
