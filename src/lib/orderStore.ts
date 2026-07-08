import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Order, OrderStatus } from "./types";

// Orders are stored as a single JSON blob in Cloudflare KV. Fine for a
// demo/prototype's order volume; swap for a real database (D1/Postgres)
// before this handles serious traffic.
const ORDERS_KEY = "orders";

async function getKV() {
  const { env } = await getCloudflareContext({ async: true });
  return env.ORDERS_KV;
}

export async function getOrders(): Promise<Order[]> {
  const kv = await getKV();
  const raw = await kv.get(ORDERS_KEY);
  const orders: Order[] = raw ? JSON.parse(raw) : [];
  // Oldest first (FIFO), so the dashboard shows the oldest ticket first.
  return orders.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function addOrder(order: Order): Promise<void> {
  const kv = await getKV();
  const orders = await getOrders();
  orders.push(order);
  await kv.put(ORDERS_KEY, JSON.stringify(orders));
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  const kv = await getKV();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;
  order.status = status;
  await kv.put(ORDERS_KEY, JSON.stringify(orders));
  return order;
}
