export type MenuCategory = "Tacos" | "Tostadas" | "Cocteles" | "Ceviche" | "Otros";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = "pay_at_pickup" | "pay_online";
export type OrderStatus = "new" | "preparing" | "ready" | "completed";

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: CartItem[];
  total: number;
  pickupDate: string;
  pickupTime: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
}
