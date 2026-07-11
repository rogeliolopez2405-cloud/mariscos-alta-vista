import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/cloudflare";
import { updateOrderStatus } from "@/lib/orderStore";
import { OrderStatus } from "@/lib/types";

const VALID_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "completed"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let status: OrderStatus;
  try {
    const body = (await request.json()) as { status: OrderStatus };
    status = body.status;
  } catch {
    return NextResponse.json(
      { error: "We couldn't read that request. Please try again." },
      { status: 400 }
    );
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const order = await updateOrderStatus(id, status);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Something went wrong updating that order. Please try again." },
      { status: 500 }
    );
  }
}
