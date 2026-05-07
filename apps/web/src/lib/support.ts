import { api } from "./api";

export interface ContactFormInput {
  subject: string;
  message: string;
  senderName?: string;
  senderEmail?: string;
}

export const supportApi = {
  contact: (input: ContactFormInput) =>
    api.post<{ data: { ok: boolean } }>("/support/contact", input).then((r) => r.data.data),
};
