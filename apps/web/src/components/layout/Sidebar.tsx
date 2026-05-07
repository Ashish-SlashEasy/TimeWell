"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Archive, HelpCircle, User, ShieldCheck, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/authStore";
import { useQueryClient } from "@tanstack/react-query";

function getTokenRole(): string | null {
  try {
    const token = getAccessToken();
    if (!token) return null;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (decoded.role as string) ?? null;
  } catch {
    return null;
  }
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
];

const bottomItems = [
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/archived", label: "Archived", icon: Archive },
  { href: "/account", label: "My Account", icon: User },
];

const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/archived", label: "Archived", icon: Archive },
  { href: "/buy", label: "Buy", icon: ShoppingBag },
  { href: "/account", label: "Account", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getTokenRole() === "admin");
  }, []);

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    clearAccessToken();
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col min-h-screen border-r bg-card sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b">
          <span className="font-serif text-xl font-semibold text-foreground">Timewell</span>
        </div>

        {/* Explore Products */}
        <div className="px-4 pt-4">
          <Link
            href="/buy"
            className="block w-full bg-primary text-primary-foreground text-sm font-medium rounded-md py-2 px-3 hover:bg-primary/90 transition-colors text-center"
          >
            Explore Products
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 pt-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/orders"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pb-4 border-t pt-3 space-y-0.5">
          {bottomItems.map(({ href, label, icon: Icon }) => (
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
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-14 px-1">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-xs transition-colors min-w-0",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active && "stroke-[2.5]")} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
