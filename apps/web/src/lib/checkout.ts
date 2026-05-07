import { api } from "./api";

export interface Sku {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CartItem {
  skuId: string;
  qty: number;
}

export const checkoutApi = {
  catalog: () => api.get<{ data: Sku[] }>("/checkout/catalog").then((r) => r.data.data),

  createSession: (cart: CartItem[], shippingAddress: ShippingAddress) =>
    api
      .post<{ data: { sessionUrl: string } }>("/checkout/session", { cart, shippingAddress })
      .then((r) => r.data.data),

  getSessionStatus: (id: string) =>
    api
      .get<{ data: { status: string; quantityGranted: number } }>(`/checkout/session/${id}`)
      .then((r) => r.data.data),
};
