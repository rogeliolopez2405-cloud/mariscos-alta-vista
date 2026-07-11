"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { MENU } from "@/lib/menu";
import { CATEGORY_ICON } from "@/lib/categoryIcons";
import { Order, OrderStatus } from "@/lib/types";

const MENU_ITEM_ICON = new Map(
  MENU.map((item) => [item.id, CATEGORY_ICON[item.category] || "🍽️"])
);

const STATUS_FLOW: OrderStatus[] = ["new", "preparing", "ready", "completed"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  new: "bg-red-100 text-red-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-200 text-gray-600",
};

const STATUS_TILE: Record<OrderStatus, { icon: string; iconBg: string }> = {
  new: { icon: "🛍️", iconBg: "bg-red-50" },
  preparing: { icon: "👨‍🍳", iconBg: "bg-amber-50" },
  ready: { icon: "✅", iconBg: "bg-green-50" },
  completed: { icon: "📋", iconBg: "bg-gray-100" },
};

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

type TicketedOrder = Order & { ticketNumber: number };

const PAGE_SIZE = 10;

export default function DashboardClient() {
  const [orders, setOrders] = useState<TicketedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    const data = await res.json();
    const fetched: Order[] = data.orders || [];
    // Orders come back oldest-first, so position in the full history is a
    // stable ticket number that doesn't shift as older orders complete.
    setOrders(fetched.map((order, i) => ({ ...order, ticketNumber: i + 1 })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function advanceStatus(order: TicketedOrder) {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[currentIndex + 1];
    if (!next) return;
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    loadOrders();
  }

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      new: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
    };
    for (const o of orders) counts[o.status]++;
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q)
      );
    }
    // Newest first for browsing/searching; ticket # (not position) shows chronological order.
    return [...result].reverse();
  }, [orders, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function selectStatus(status: OrderStatus) {
    setPage(1);
    setStatusFilter((prev) => (prev === status ? null : status));
  }

  return (
    <DashboardShell>
      <main className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-serif text-2xl text-maroon">Orders — Mariscos Alta Vista</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search customer or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border border-gold/30 rounded-full px-4 py-2 text-sm w-56 focus:outline-none focus:border-maroon"
            />
            <button
              onClick={loadOrders}
              className="text-sm border border-maroon text-maroon rounded-full px-4 py-2 font-semibold whitespace-nowrap"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATUS_FLOW.map((status) => (
            <button
              key={status}
              onClick={() => selectStatus(status)}
              className={`text-left bg-white rounded-xl border p-4 transition-colors ${
                statusFilter === status
                  ? "border-maroon ring-1 ring-maroon"
                  : "border-gold/20 hover:border-maroon/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${STATUS_TILE[status].iconBg}`}
                >
                  {STATUS_TILE[status].icon}
                </span>
                <span className="text-sm text-foreground/60">{STATUS_LABEL[status]}</span>
              </div>
              <p className="text-2xl font-bold text-maroon">{statusCounts[status]}</p>
            </button>
          ))}
        </div>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="text-xs text-maroon font-semibold underline mb-4"
          >
            Clear filter ({STATUS_LABEL[statusFilter]})
          </button>
        )}

        {loading && <p>Loading orders...</p>}
        {!loading && pageOrders.length === 0 && (
          <p className="text-foreground/60">No orders match right now.</p>
        )}

        <div className="space-y-4">
          {pageOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm border border-maroon/10 p-4"
            >
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_BADGE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-maroon/70 tracking-wide">
                      TICKET #{order.ticketNumber}
                    </p>
                    <p className="font-bold">{order.customerName}</p>
                    <p className="text-sm text-foreground/60">{order.customerPhone}</p>
                  </div>
                </div>
                <span className="font-semibold">{formatMoney(order.total)}</span>
              </div>

              <ul className="text-sm mb-3 space-y-1">
                {order.items.map((item) => (
                  <li key={item.menuItemId} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cream flex items-center justify-center text-xs shrink-0">
                      {MENU_ITEM_ICON.get(item.menuItemId) || "🍽️"}
                    </span>
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="text-sm italic text-foreground/60 mb-2">
                  Note: {order.notes}
                </p>
              )}

              <div className="flex justify-between items-center text-sm mb-3">
                <span>
                  Pickup: {order.pickupDate} {order.pickupTime}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/50">
                  {order.paymentMethod === "pay_online" ? "Paid online" : "Pay at pickup"}
                </span>
                {STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
                  <button
                    onClick={() => advanceStatus(order)}
                    className="bg-maroon text-white text-sm font-semibold px-4 py-2 rounded-full"
                  >
                    Mark as {STATUS_LABEL[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-full border border-maroon/30 text-maroon disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-full text-sm font-semibold ${
                  p === page ? "bg-maroon text-white" : "border border-maroon/30 text-maroon"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-full border border-maroon/30 text-maroon disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-foreground/40 mt-3">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} order{filtered.length === 1 ? "" : "s"}
          </p>
        )}
      </main>
    </DashboardShell>
  );
}
