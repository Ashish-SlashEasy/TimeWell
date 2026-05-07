import { api } from "./api";

export type OrderStatus = "new" | "in_production" | "shipped" | "delivered" | "cancelled";
export type Carrier = "usps" | "ups" | "fedex" | "dhl" | "other";

export interface AdminOrderOwner {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface AdminOrderCard {
  _id: string;
  title?: string | null;
  message?: string | null;
  coverImage?: {
    original?: string | null;
    web?: string | null;
    thumb?: string | null;
    orientation: "landscape" | "portrait";
  } | null;
  orientation: "landscape" | "portrait";
  shareToken: string;
}

export interface AdminNote {
  _id: string;
  adminId: { _id: string; firstName?: string | null; lastName?: string | null } | string;
  text: string;
  createdAt: string;
}

export interface ActivityEntry {
  actorId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  timestamp: string;
  reason?: string | null;
}

export interface AdminOrder {
  _id: string;
  status: OrderStatus;
  printFileKey?: string | null;
  qrPngKey?: string | null;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string | null;
  carrier?: Carrier | null;
  submittedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: AdminOrderOwner;
  cardId: AdminOrderCard;
  adminNotes: AdminNote[];
  activityLog: ActivityEntry[];
}

export interface AdminOrderSummary {
  _id: string;
  status: OrderStatus;
  submittedAt?: string | null;
  createdAt: string;
  ownerId: { _id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
  cardId: { _id: string; title?: string | null; coverImage?: { thumb?: string | null } | null };
}

export interface ListOrdersResponse {
  orders: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminApi = {
  listOrders: (params: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ data: ListOrdersResponse }>("/admin/orders", { params }).then((r) => r.data.data),

  getOrder: (id: string) =>
    api.get<{ data: AdminOrder }>(`/admin/orders/${id}`).then((r) => r.data.data),

  updateStatus: (
    id: string,
    body: { status: OrderStatus; trackingNumber?: string; carrier?: Carrier; reason?: string },
  ) =>
    api
      .patch<{ data: { id: string; status: OrderStatus } }>(`/admin/orders/${id}/status`, body)
      .then((r) => r.data.data),

  addNote: (id: string, text: string) =>
    api
      .post<{ data: { id: string; noteCount: number } }>(`/admin/orders/${id}/notes`, { text })
      .then((r) => r.data.data),

  getDownloadUrl: (id: string, fileType: "print" | "qr") =>
    api
      .get<{ data: { url: string } }>(`/admin/orders/${id}/files/${fileType}`)
      .then((r) => r.data.data),
};
