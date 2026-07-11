import { Order } from "./types";

function formatOrderSummary(order: Order): string {
  const lines = order.items.map(
    (item) => `${item.quantity}x ${item.name}`
  );
  return [
    `New order — Mariscos Alta Vista`,
    `${order.customerName} · ${order.customerPhone}`,
    ...lines,
    `Pickup: ${order.pickupDate} ${order.pickupTime}`,
    `Payment: ${order.paymentMethod === "pay_online" ? "Paid online" : "Pay at pickup"}`,
    `Total: $${order.total.toFixed(2)}`,
  ].join("\n");
}

function formatCustomerConfirmation(order: Order): string {
  const lines = order.items.map(
    (item) => `${item.quantity}x ${item.name}`
  );
  return [
    `Mariscos Alta Vista - order confirmed!`,
    ...lines,
    `Pickup: ${order.pickupDate} ${order.pickupTime}`,
    `Total: $${order.total.toFixed(2)}`,
    order.paymentMethod === "pay_at_pickup" ? `Pay at pickup.` : `Paid online.`,
    `See you soon!`,
  ].join("\n");
}

// Normalizes to E.164 (e.g. "3104259053" -> "+13104259053"). Twilio rejects
// numbers without a leading "+", so a bare 10-digit US number needs "+1"
// prepended, and an 11-digit number starting with "1" just needs the "+".
function toE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

// Needs env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = toE164(to);

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS - stub, no Twilio configured] to ${toNumber}\n${body}`);
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: body }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SMS] Twilio error sending to ${toNumber}: ${response.status} ${errorText}`);
  }
}

// Texts the owner a summary of the new order.
// Needs env var: OWNER_PHONE_NUMBER (plus the Twilio vars above)
export async function notifyNewOrderBySms(order: Order): Promise<void> {
  const ownerPhone = process.env.OWNER_PHONE_NUMBER;
  if (!ownerPhone) {
    console.log("[SMS - stub, no OWNER_PHONE_NUMBER configured]\n" + formatOrderSummary(order));
    return;
  }
  await sendSms(ownerPhone, formatOrderSummary(order));
}

// Texts the customer a confirmation at the number they entered on the order.
export async function notifyCustomerBySms(order: Order): Promise<void> {
  await sendSms(order.customerPhone, formatCustomerConfirmation(order));
}

// Needs env var: RESEND_API_KEY. Uses Resend's default onboarding@resend.dev
// sender unless RESEND_FROM_EMAIL is set to a verified domain address.
async function sendEmail(to: string, subject: string, textBody: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.log(`[Email - stub, no Resend configured] to ${to}\nSubject: ${subject}\n${textBody}`);
    return;
  }

  const html = textBody
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px">${line}</p>`)
    .join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Email] Resend error sending to ${to}: ${response.status} ${errorText}`);
  }
}

// Emails the owner a summary of the new order.
// Needs env var: OWNER_EMAIL (plus the Resend vars above)
export async function notifyNewOrderByEmail(order: Order): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.log("[Email - stub, no OWNER_EMAIL configured]\n" + formatOrderSummary(order));
    return;
  }
  await sendEmail(ownerEmail, "New order — Mariscos Alta Vista", formatOrderSummary(order));
}

// Emails the customer a confirmation, only if they provided an email on the order.
export async function notifyCustomerByEmail(order: Order): Promise<void> {
  if (!order.customerEmail) return;
  await sendEmail(
    order.customerEmail,
    "Your Mariscos Alta Vista order is confirmed!",
    formatCustomerConfirmation(order)
  );
}

export async function notifyNewOrder(order: Order): Promise<void> {
  const results = await Promise.allSettled([
    notifyNewOrderBySms(order),
    notifyCustomerBySms(order),
    notifyNewOrderByEmail(order),
    notifyCustomerByEmail(order),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notifyNewOrder] notification failed:", result.reason);
    }
  }
}
