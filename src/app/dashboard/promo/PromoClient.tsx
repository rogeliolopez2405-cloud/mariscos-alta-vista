"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "../DashboardShell";
import { Order } from "@/lib/types";

const DEFAULT_MESSAGE =
  "🎉 Special this weekend at Mariscos Alta Vista! [describe your sale] on [date] from [start time] to [end time]. Order ahead:";

export default function PromoClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [copiedWhat, setCopiedWhat] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    setSiteUrl(window.location.origin);
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const phones = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => o.customerPhone?.trim() && set.add(o.customerPhone.trim()));
    return Array.from(set);
  }, [orders]);

  const emails = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => o.customerEmail?.trim() && set.add(o.customerEmail.trim()));
    return Array.from(set);
  }, [orders]);

  const fullMessage = `${message.trim()} ${siteUrl}`.trim();

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWhat(label);
    setTimeout(() => setCopiedWhat(null), 2000);
  }, []);

  function sendText() {
    const body = encodeURIComponent(fullMessage);
    window.location.href = `sms:${phones.join(",")}?&body=${body}`;
  }

  function sendEmail() {
    const subject = encodeURIComponent("A special from Mariscos Alta Vista");
    const body = encodeURIComponent(fullMessage);
    window.location.href = `mailto:?bcc=${emails.join(",")}&subject=${subject}&body=${body}`;
  }

  return (
    <DashboardShell>
    <main className="min-h-screen p-4 sm:p-8 max-w-lg mx-auto pb-16">
      <h1 className="font-serif text-2xl text-maroon mb-1">Send a promo</h1>
      <p className="text-sm text-foreground/60 mb-6">
        Write your message, then send it to everyone who's ordered before.
      </p>

      <label className="block text-sm font-semibold mb-1">Message</label>
      <textarea
        className="w-full border rounded-lg px-3 py-2 mb-1"
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <p className="text-xs text-foreground/50 mb-6">
        Your website link is added automatically at the end.
      </p>

      {loading && <p className="text-sm text-foreground/60">Loading contacts...</p>}

      {!loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gold/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">📱 Phone ({phones.length})</p>
              <button
                onClick={() => copyToClipboard(phones.join(", "), "phones")}
                className="text-xs text-maroon font-semibold"
                disabled={phones.length === 0}
              >
                {copiedWhat === "phones" ? "Copied!" : "Copy numbers"}
              </button>
            </div>
            <button
              onClick={sendText}
              disabled={phones.length === 0}
              className="w-full bg-maroon text-white py-3 rounded-full font-semibold tracking-wide disabled:opacity-40"
            >
              Text everyone
            </button>
            {phones.length === 0 && (
              <p className="text-xs text-foreground/50 mt-2">
                No customer phone numbers yet.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gold/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">✉️ Email ({emails.length})</p>
              <button
                onClick={() => copyToClipboard(emails.join(", "), "emails")}
                className="text-xs text-maroon font-semibold"
                disabled={emails.length === 0}
              >
                {copiedWhat === "emails" ? "Copied!" : "Copy emails"}
              </button>
            </div>
            <button
              onClick={sendEmail}
              disabled={emails.length === 0}
              className="w-full border border-maroon text-maroon py-3 rounded-full font-semibold tracking-wide disabled:opacity-40"
            >
              Email everyone
            </button>
            {emails.length === 0 && (
              <p className="text-xs text-foreground/50 mt-2">
                No customer emails yet — email is optional at checkout.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gold/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">📸 Social media</p>
            </div>
            <button
              onClick={() => copyToClipboard(fullMessage, "caption")}
              className="w-full border border-maroon text-maroon py-3 rounded-full font-semibold tracking-wide"
            >
              {copiedWhat === "caption" ? "Copied!" : "Copy caption"}
            </button>
            <p className="text-xs text-foreground/50 mt-2">
              Copies your message + link, ready to paste into Instagram, Facebook,
              or WhatsApp Status.
            </p>
          </div>

          <p className="text-xs text-foreground/50">
            &quot;Text everyone&quot; opens your phone&apos;s messaging app with all
            numbers and your message pre-filled — you tap send. Since it&apos;s a
            group text, customers can see each other&apos;s numbers.
          </p>
        </div>
      )}
    </main>
    </DashboardShell>
  );
}
