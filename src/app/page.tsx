"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { CATEGORY_ORDER, MENU } from "@/lib/menu";
import { CATEGORY_ICON } from "@/lib/categoryIcons";
import { CartItem, PaymentMethod } from "@/lib/types";

type Cart = Record<string, number>; // menuItemId -> quantity

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

// Pickup slots, store, and store the label directly (e.g. "6:00 PM") since
// it's only ever displayed, never parsed — sidesteps the browser/OS locale
// deciding whether a native time input shows 12h or 24h ("military") time.
function buildPickupTimeSlots() {
  const slots: string[] = [];
  for (let minutes = 11 * 60; minutes <= 21 * 60; minutes += 15) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour24 < 12 ? "AM" : "PM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    slots.push(`${hour12}:${minute.toString().padStart(2, "0")} ${period}`);
  }
  return slots;
}

const PICKUP_TIME_SLOTS = buildPickupTimeSlots();

export default function OrderPage() {
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_pickup");
  const [notes, setNotes] = useState("");

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, typeof MENU> = {};
    for (const item of MENU) {
      grouped[item.category] = grouped[item.category] || [];
      grouped[item.category].push(item);
    }
    return grouped;
  }, []);

  const cartItems: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, quantity]) => {
        const menuItem = MENU.find((m) => m.id === menuItemId)!;
        return {
          menuItemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
        };
      });
  }, [cart]);

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      next[menuItemId] = Math.max(0, (next[menuItemId] || 0) + delta);
      return next;
    });
  }

  function scrollToMenu() {
    menuRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    if (!pickupTime) {
      setError("Please choose a pickup time.");
      return;
    }
    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail: customerEmail.trim() || undefined,
          pickupDate,
          pickupTime,
          paymentMethod,
          notes,
          items: cartItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong placing your order.");
      }
      const { order } = await res.json();
      setConfirmedOrderId(order.id);
      setCart({});
      setCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedOrderId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-10 border border-gold/30">
          <div className="text-5xl mb-4">🦐</div>
          <div className="w-10 h-px bg-gold mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-maroon mb-3">
            Order received
          </h1>
          <p className="text-foreground/80 mb-6">
            {paymentMethod === "pay_online"
              ? "Online payments are launching soon — we'll confirm your order and you can pay when you pick it up."
              : "We'll see you at pickup. Pay in person with cash or card."}
          </p>
          <p className="text-xs tracking-widest uppercase text-foreground/40 mb-6">
            Order #{confirmedOrderId.slice(0, 8)}
          </p>
          <button
            className="bg-maroon text-white px-6 py-3 rounded-full font-semibold tracking-wide hover:bg-maroon-dark transition"
            onClick={() => setConfirmedOrderId(null)}
          >
            Place another order
          </button>
        </div>
      </main>
    );
  }

  const cartPanelContent = (
    <>
      <p className="font-serif text-lg tracking-[0.15em] text-maroon uppercase mb-4">
        Your order
      </p>

      {cartItems.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center mx-auto mb-3 text-2xl">
            🛍️
          </div>
          <p className="font-semibold mb-1">Your cart is empty</p>
          <p className="text-sm text-foreground/50 mb-5">
            Add items from the menu to get started.
          </p>
          <button
            onClick={scrollToMenu}
            className="w-full bg-maroon text-white py-3 rounded-full font-semibold tracking-wide hover:bg-maroon-dark transition"
          >
            Start an order
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-3">
            {cartItems.map((item) => (
              <li key={item.menuItemId} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatMoney(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-bold border-t border-gold/20 pt-2 mb-5">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>

          <form onSubmit={submitOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone number</label>
              <input
                type="tel"
                className="w-full border rounded-lg px-3 py-2"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="For special offers — optional"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Pickup date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  min={todayISO()}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Pickup time</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a time
                  </option>
                  {PICKUP_TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Notes (optional)</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Payment</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "pay_at_pickup"}
                    onChange={() => setPaymentMethod("pay_at_pickup")}
                  />
                  Pay at pickup (cash or card)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "pay_online"}
                    onChange={() => setPaymentMethod("pay_online")}
                  />
                  Pay online now (coming soon)
                </label>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-maroon text-white py-3 rounded-full font-semibold disabled:opacity-50"
            >
              {submitting ? "Placing order..." : `Place order · ${formatMoney(total)}`}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 pt-5 border-t border-gold/20 space-y-4">
        {[
          { icon: "🕐", title: "Fast & easy", copy: "Order ahead and skip the wait." },
          { icon: "🌟", title: "Fresh daily", copy: "Made to order with the freshest ingredients." },
          { icon: "🔒", title: "Secure ordering", copy: "Your information is safe and secure." },
        ].map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <span className="text-lg shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-bold">{f.title}</p>
              <p className="text-xs text-foreground/50">{f.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <main className="min-h-screen pb-28 lg:pb-0">
      <header className="relative bg-charcoal text-white text-center overflow-hidden">
        <Image
          src="/promo/seafood-weekend.jpg"
          alt="Mariscos Alta Vista — shrimp ceviche and shrimp cocktail"
          width={900}
          height={1035}
          priority
          className="w-full max-h-72 object-cover object-top opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-black/10" />

        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden absolute top-4 right-4 bg-white/10 backdrop-blur border border-white/20 text-white rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2"
        >
          View cart
          {itemCount > 0 && (
            <span className="bg-gold text-charcoal rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </button>

        <div className="relative py-8 px-4">
          <p className="text-xs tracking-[0.3em] uppercase text-gold-light mb-2">
            Est. Paramount, California
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wide">
            Mariscos Alta Vista
          </h1>
          <div className="w-14 h-px bg-gold mx-auto my-3" />
          <p className="text-sm tracking-wide text-white/80">
            Fine coastal Mexican seafood · Order ahead for pickup
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:flex lg:gap-8 lg:items-start">
        <div ref={menuRef} className="lg:flex-1 max-w-2xl mx-auto lg:mx-0">
          {CATEGORY_ORDER.filter((cat) => itemsByCategory[cat]?.length).map(
            (category) => (
              <section key={category} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-serif text-2xl text-maroon">{category}</h2>
                  <div className="flex-1 h-px bg-gold/40" />
                  <span className="text-2xl text-gold/60" aria-hidden>
                    {CATEGORY_ICON[category]}
                  </span>
                </div>
                <div className="space-y-3">
                  {itemsByCategory[category].map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gold/20"
                      >
                        <div className="pr-3">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-foreground/60">
                            {item.description}
                          </p>
                          <p className="text-sm font-semibold text-maroon mt-1">
                            {formatMoney(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {qty > 0 && (
                            <>
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                className="w-8 h-8 rounded-full border border-maroon text-maroon font-bold"
                              >
                                −
                              </button>
                              <span className="w-4 text-center">{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 rounded-full bg-maroon text-white font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0 sticky top-6">
          <div className="bg-white rounded-2xl border border-gold/20 p-6">
            {cartPanelContent}
          </div>
        </aside>
      </div>

      {itemCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 bg-maroon text-white rounded-full px-6 py-3 shadow-lg font-semibold flex items-center gap-3"
        >
          <span>View cart · {itemCount} item{itemCount > 1 ? "s" : ""}</span>
          <span>{formatMoney(total)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="sr-only">Your order</span>
              <div />
              <button onClick={() => setCartOpen(false)} className="text-2xl leading-none">
                &times;
              </button>
            </div>
            {cartPanelContent}
          </div>
        </div>
      )}
    </main>
  );
}
