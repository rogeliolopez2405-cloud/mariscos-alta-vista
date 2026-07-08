import { NextRequest, NextResponse } from "next/server";
import { addOrder, getOrders } from "@/lib/orderStore";
import { notifyNewOrder } from "@/lib/notify";
import { MENU } from "@/lib/menu";
import { CartItem, Order, PaymentMethod } from "@/lib/types";

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json({ orders });
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
  const body = (await request.json()) as CreateOrderBody;

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

  const items: CartItem[] = body.items.map((line) => {
    const menuItem = MENU.find((m) => m.id === line.menuItemId);
    if (!menuItem) throw new Error(`Unknown menu item: ${line.menuItemId}`);
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: line.quantity,
    };
  });

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

  await addOrder(order);
  await notifyNewOrder(order);

  return NextResponse.json({ order }, { status: 201 });
}
