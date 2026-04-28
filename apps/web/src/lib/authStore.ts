import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  clear: () => set({ accessToken: null }),
}));

export const getAccessToken = (): string | null => useAuthStore.getState().accessToken;
export const setAccessToken = (token: string | null): void =>
  useAuthStore.getState().setAccessToken(token);
export const clearAccessToken = (): void => useAuthStore.getState().clear();
