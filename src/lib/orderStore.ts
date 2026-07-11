import { getCloudflareContext } from "@opennextjs/cloudflare";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Order, OrderStatus } from "./types";

// Orders are stored as a single JSON blob in Cloudflare KV. Fine for a
// demo/prototype's order volume; swap for a real database (D1/Postgres)
// before this handles serious traffic.
const ORDERS_KEY = "orders";

// `next dev` can't reach the real Cloudflare KV binding on this machine
// (workerd has no win32/arm64 build), so fall back to a local JSON file
// for local testing. Production (Cloudflare Workers) always uses real KV.
const LOCAL_STORE_PATH = path.join(process.cwd(), "data", "orders.local.json");

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

function localFileKV(): KVLike {
  return {
    async get(key: string) {
      if (key !== ORDERS_KEY) return null;
      try {
        return await readFile(LOCAL_STORE_PATH, "utf-8");
      } catch {
        return null;
      }
    },
    async put(key: string, value: string) {
      if (key !== ORDERS_KEY) return;
      await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
      await writeFile(LOCAL_STORE_PATH, value, "utf-8");
    },
  };
}

async function getKV(): Promise<KVLike> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.ORDERS_KV;
  } catch {
    return localFileKV();
  }
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
