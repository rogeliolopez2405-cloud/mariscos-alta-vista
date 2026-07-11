"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../DashboardShell";
import { Order } from "@/lib/types";

type RangeKey = "today" | "week" | "all";

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  week: "This week",
  all: "All time",
};

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function withinRange(order: Order, range: RangeKey, now: Date) {
  const created = new Date(order.createdAt);
  if (range === "today") return isSameDay(created, now);
  if (range === "week") {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    return created >= sevenDaysAgo && created <= now;
  }
  return true;
}

export default function ReportsClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("week");

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => withinRange(o, range, now));
  }, [orders, range]);

  const totalSales = filtered.reduce((sum, o) => sum + o.total, 0);
  const orderCount = filtered.length;
  const avgOrder = orderCount > 0 ? totalSales / orderCount : 0;
  const itemsSold = filtered.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const bestSellers = useMemo(() => {
    const byItem = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of filtered) {
      for (const item of order.items) {
        const existing = byItem.get(item.menuItemId);
        const revenue = item.price * item.quantity;
        if (existing) {
          existing.qty += item.quantity;
          existing.revenue += revenue;
        } else {
          byItem.set(item.menuItemId, { name: item.name, qty: item.quantity, revenue });
        }
      }
    }
    return Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const maxItemRevenue = bestSellers.length > 0 ? bestSellers[0].revenue : 0;

  const salesByDay = useMemo(() => {
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const order of filtered) {
      const key = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const existing = byDay.get(key);
      if (existing) {
        existing.revenue += order.total;
        existing.orders += 1;
      } else {
        byDay.set(key, { revenue: order.total, orders: 1 });
      }
    }
    // Map preserves insertion order; orders arrive oldest-first, so reverse for newest-first.
    return Array.from(byDay.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .reverse();
  }, [filtered]);

  // Chart wants chronological (oldest-first) order, the opposite of the list above.
  const chartData = useMemo(() => [...salesByDay].reverse(), [salesByDay]);

  const chart = useMemo(() => {
    const width = 600;
    const height = 200;
    const padTop = 16;
    const padBottom = 28;
    const padX = 8;
    const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
    const plotHeight = height - padTop - padBottom;
    const stepX =
      chartData.length > 1 ? (width - padX * 2) / (chartData.length - 1) : 0;

    const points = chartData.map((d, i) => {
      const x = padX + i * stepX;
      const y = padTop + plotHeight - (d.revenue / maxRevenue) * plotHeight;
      return { x, y, ...d };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padBottom} L ${points[0].x.toFixed(1)} ${height - padBottom} Z`
        : "";

    const peakIndex = points.reduce(
      (best, p, i) => (p.revenue > points[best].revenue ? i : best),
      0
    );

    return { width, height, points, linePath, areaPath, peakIndex };
  }, [chartData]);

  return (
    <DashboardShell>
      <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <h1 className="font-serif text-2xl text-maroon">Sales report</h1>
          <div className="flex gap-2">
            {(Object.keys(RANGE_LABEL) as RangeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                  range === key
                    ? "bg-maroon text-white border-maroon"
                    : "border-maroon/30 text-maroon"
                }`}
              >
                {RANGE_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-foreground/60">Loading sales data...</p>}

        {!loading && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total sales", value: formatMoney(totalSales) },
                { label: "Orders", value: String(orderCount) },
                { label: "Avg order", value: formatMoney(avgOrder) },
                { label: "Items sold", value: String(itemsSold) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl border border-gold/20 p-4"
                >
                  <p className="text-xs text-foreground/50 font-semibold mb-1 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-maroon">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gold/20 p-5">
              <h2 className="font-serif text-lg text-maroon mb-4">Sales overview</h2>
              {chartData.length === 0 && (
                <p className="text-sm text-foreground/50">No orders in this range yet.</p>
              )}
              {chartData.length > 0 && (
                <svg
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  className="w-full h-auto overflow-visible"
                  role="img"
                  aria-label="Sales over time"
                >
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6b1220" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6b1220" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chart.areaPath} fill="url(#areaFill)" />
                  <path
                    d={chart.linePath}
                    fill="none"
                    stroke="#6b1220"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chart.points.map((p, i) => (
                    <g key={p.date}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={i === chart.peakIndex ? 5 : 3}
                        fill={i === chart.peakIndex ? "#b78a45" : "#6b1220"}
                        stroke="#fff"
                        strokeWidth="2"
                      />
                      <text
                        x={p.x}
                        y={chart.height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#8a7a6d"
                      >
                        {p.date}
                      </text>
                      {i === chart.peakIndex && (
                        <text
                          x={p.x}
                          y={p.y - 12}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="#6b1220"
                        >
                          {formatMoney(p.revenue)}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gold/20 p-5">
              <h2 className="font-serif text-lg text-maroon mb-4">What&apos;s selling</h2>
              {bestSellers.length === 0 && (
                <p className="text-sm text-foreground/50">No orders in this range yet.</p>
              )}
              <div className="space-y-4">
                {bestSellers.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground/40 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline text-sm mb-1">
                        <span className="font-semibold truncate">{item.name}</span>
                        <span className="text-foreground/60 shrink-0 ml-2">
                          {item.qty} sold ·{" "}
                          <span className="font-semibold text-maroon">
                            {formatMoney(item.revenue)}
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-black/5 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-maroon h-full rounded-full"
                          style={{
                            width: `${maxItemRevenue > 0 ? (item.revenue / maxItemRevenue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gold/20 overflow-hidden">
              <h2 className="font-serif text-lg text-maroon p-5 pb-3">Sales by day</h2>
              {salesByDay.length === 0 && (
                <p className="text-sm text-foreground/50 px-5 pb-5">
                  No orders in this range yet.
                </p>
              )}
              <div className="divide-y divide-gold/10">
                {salesByDay.map((day) => (
                  <div
                    key={day.date}
                    className="flex justify-between items-center px-5 py-3 text-sm"
                  >
                    <span className="font-semibold">{day.date}</span>
                    <span className="text-foreground/60">
                      {day.orders} order{day.orders === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-maroon">
                      {formatMoney(day.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardShell>
  );
}
