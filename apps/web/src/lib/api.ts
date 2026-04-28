import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse } from "@timewell/shared";
import { ErrorCode, ErrorMessages } from "@timewell/shared";
import { getAccessToken, setAccessToken, clearAccessToken } from "./authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await axios.post<{ data: { accessToken: string } }>(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const next = res.data?.data?.accessToken ?? null;
      if (next) setAccessToken(next);
      else clearAccessToken();
      return next;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetryConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login")
    ) {
      original._retried = true;
      const next = await refreshAccessToken();
      if (next) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${next}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Map an Axios error to a friendly user message. */
export function getFriendlyMessage(err: unknown): string {
  if (!(err instanceof AxiosError)) {
    return ErrorMessages.INTERNAL_ERROR;
  }
  if (!err.response) {
    return "We couldn't reach the server. Please check your connection and try again.";
  }
  const code = err.response.data?.error?.code as ErrorCode | undefined;
  const message = err.response.data?.error?.message;
  if (code && ErrorMessages[code]) return ErrorMessages[code];
  return message ?? ErrorMessages.INTERNAL_ERROR;
}
