"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { adminApi, type OrderStatus } from "@/lib/admin";
import { getAccessToken } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STATUS_FILTERS = ["all", "new", "in_production", "shipped", "delivered", "cancelled"] as const;
type FilterValue = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<FilterValue, string> = {
  all: "All",
  new: "New",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_PILL: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_production: "bg-amber-100 text-amber-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ownerName(o: { firstName?: string | null; lastName?: string | null }): string {
  return [o.firstName, o.lastName].filter(Boolean).join(" ") || "—";
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", filter, search, page],
    queryFn: () =>
      adminApi.listOrders({ status: filter === "all" ? undefined : filter, search: search || undefined, page }),
  });

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const es = new EventSource(`${API_URL}/api/admin/orders/stream?token=${encodeURIComponent(token)}`);
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data as string);
        if (payload.type === "order_updated") {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [queryClient]);

  function changeFilter(f: FilterValue) {
    setFilter(f);
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          {isFetching && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Order ID, email, or card title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => changeFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Card Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Loading orders…
                </td>
              </tr>
            ) : !data?.orders.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              data.orders.map((order) => (
                <tr key={order._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground tracking-wide">
                    …{order._id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{ownerName(order.ownerId)}</div>
                    <div className="text-xs text-muted-foreground">{order.ownerId.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{order.cardId.title ?? "Untitled"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(order.submittedAt ?? order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order._id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list ── */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading orders…</div>
        ) : !data?.orders.length ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No orders found.</div>
        ) : (
          data.orders.map((order) => (
            <div key={order._id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground tracking-wide">
                  …{order._id.slice(-8).toUpperCase()}
                </span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{ownerName(order.ownerId)}</p>
                <p className="text-xs text-muted-foreground">{order.ownerId.email}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{order.cardId.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(order.submittedAt ?? order.createdAt)}</p>
                </div>
                <Link href={`/admin/orders/${order._id}`}>
                  <Button size="sm" variant="outline">View</Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {data.total} order{data.total !== 1 ? "s" : ""} &middot; page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
