"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Order, OrderStatus } from "@/lib/types";

const STATUS_FLOW: OrderStatus[] = ["new", "preparing", "ready", "completed"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: "bg-red-100 text-red-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-200 text-gray-600",
};

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

type TicketedOrder = Order & { ticketNumber: number };

export default function DashboardClient() {
  const [orders, setOrders] = useState<TicketedOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  const activeOrders = orders.filter((o) => o.status !== "completed");
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="font-serif text-2xl text-maroon">Orders — Mariscos Alta Vista</h1>
        <button
          onClick={loadOrders}
          className="text-sm border border-maroon text-maroon rounded-full px-4 py-2 font-semibold"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-4 mb-6 text-sm">
        <Link href="/dashboard/promo" className="text-maroon font-semibold underline">
          Send a promo
        </Link>
        <Link href="/dashboard/qr-code" className="text-maroon font-semibold underline">
          QR code
        </Link>
      </div>

      {loading && <p>Loading orders...</p>}
      {!loading && activeOrders.length === 0 && (
        <p className="text-foreground/60">No active orders right now.</p>
      )}

      <div className="space-y-4">
        {activeOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-xl shadow-sm border border-maroon/10 p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-bold text-maroon/70 tracking-wide">
                  TICKET #{order.ticketNumber}
                </p>
                <p className="font-bold">{order.customerName}</p>
                <p className="text-sm text-foreground/60">{order.customerPhone}</p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <ul className="text-sm mb-2">
              {order.items.map((item) => (
                <li key={item.menuItemId}>
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
              <span className="font-semibold">{formatMoney(order.total)}</span>
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

      {completedOrders.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-foreground/60">
            Completed orders ({completedOrders.length})
          </summary>
          <div className="space-y-2 mt-3">
            {completedOrders.map((order) => (
              <div
                key={order.id}
                className="text-sm border border-maroon/10 rounded-lg p-3 flex justify-between"
              >
                <span>
                  #{order.ticketNumber} · {order.customerName} — {order.items.length} item(s)
                </span>
                <span>{formatMoney(order.total)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
