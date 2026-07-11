import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/cloudflare";
import { addOrder, getOrders } from "@/lib/orderStore";
import { notifyNewOrder } from "@/lib/notify";
import { MENU } from "@/lib/menu";
import { CartItem, Order, PaymentMethod } from "@/lib/types";

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Something went wrong loading orders. Please try again." },
      { status: 500 }
    );
  }
}

interface CreateOrderBody {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: { menuItemId: string; quantity: number }[];
  pickupDate: string;
  pickupTime: string;
  notes?: string;
  paymentMethod: PaymentMethod;
}

export async function POST(request: NextRequest) {
  let body: CreateOrderBody;
  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json(
      { error: "We couldn't read your order. Please try again." },
      { status: 400 }
    );
  }

  if (
    !body.customerName?.trim() ||
    !body.customerPhone?.trim() ||
    !body.items?.length ||
    !body.pickupDate ||
    !body.pickupTime
  ) {
    return NextResponse.json(
      { error: "Missing required order fields." },
      { status: 400 }
    );
  }

  const items: CartItem[] = [];
  for (const line of body.items) {
    const menuItem = MENU.find((m) => m.id === line.menuItemId);
    if (!menuItem) {
      return NextResponse.json(
        { error: `That item isn't on the menu anymore. Please refresh and try again.` },
        { status: 400 }
      );
    }
    items.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: line.quantity,
    });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order: Order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: body.customerName.trim(),
    customerPhone: body.customerPhone.trim(),
    customerEmail: body.customerEmail?.trim() || undefined,
    items,
    total,
    pickupDate: body.pickupDate,
    pickupTime: body.pickupTime,
    notes: body.notes?.trim() || undefined,
    paymentMethod: body.paymentMethod,
    status: "new",
  };

  try {
    await addOrder(order);
    await notifyNewOrder(order);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Something went wrong saving your order. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ order }, { status: 201 });
}
