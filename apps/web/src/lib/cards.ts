import { api } from "./api";
import type { CreateCardInput, UpdateCardInput } from "@timewell/shared";

export interface CardCoverImage {
  original: string | null;
  web: string | null;
  thumb: string | null;
  orientation: "landscape" | "portrait";
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Card {
  id: string;
  shareToken: string;
  status: "draft" | "in_progress" | "ordered" | "archived" | "deleted";
  title: string | null;
  message: string | null;
  orientation: "landscape" | "portrait";
  coverImage: CardCoverImage;
  settings: { passwordProtected: boolean; allowContributions: boolean };
  printBundle: { jpgKey: string | null; qrPngKey: string | null; generatedAt: string | null };
  orderedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: string;
  cardId: string;
  mediaType: "photo" | "video" | "audio";
  mediaKey: string;
  senderName: string;
  senderMessage: string | null;
  status: string;
  createdAt: string;
}

export const cardsApi = {
  list: () => api.get<{ data: Card[] }>("/cards").then((r) => r.data.data),
  listArchived: () => api.get<{ data: Card[] }>("/cards?filter=archived").then((r) => r.data.data),
  get: (id: string) => api.get<{ data: Card }>(`/cards/${id}`).then((r) => r.data.data),
  create: (input: CreateCardInput) =>
    api.post<{ data: Card }>("/cards", input).then((r) => r.data.data),
  update: (id: string, input: UpdateCardInput) =>
    api.patch<{ data: Card }>(`/cards/${id}`, input).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/cards/${id}`),
  archive: (id: string) => api.post<{ data: Card }>(`/cards/${id}/archive`).then((r) => r.data.data),
  restore: (id: string) => api.post<{ data: Card }>(`/cards/${id}/restore`).then((r) => r.data.data),
  submitOrder: (id: string, address: ShippingAddress) =>
    api.post<{ data: Card }>(`/cards/${id}/submit-order`, address).then((r) => r.data.data),
  uploadCover: (id: string, file: File) => {
    const form = new FormData();
    form.append("cover", file);
    return api.post<{ data: Card }>(`/cards/${id}/cover`, form).then((r) => r.data.data);
  },
  uploadCoverFromUrl: (id: string, url: string) =>
    api.post<{ data: Card }>(`/cards/${id}/cover-from-url`, { url }).then((r) => r.data.data),
};

export const contributionsApi = {
  list: (cardId: string) =>
    api.get<{ data: Contribution[] }>(`/cards/${cardId}/contributions`).then((r) => r.data.data),
  upload: (cardId: string, file: File, senderName: string, senderMessage?: string) => {
    const form = new FormData();
    form.append("photo", file);
    form.append("senderName", senderName);
    if (senderMessage) form.append("senderMessage", senderMessage);
    return api
      .post<{ data: Contribution }>(`/cards/${cardId}/contributions`, form)
      .then((r) => r.data.data);
  },
};
