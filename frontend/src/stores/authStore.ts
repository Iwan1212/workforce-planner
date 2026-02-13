import { create } from "zustand";
import {
  getToken,
  removeTokens,
  setToken,
  setRefreshToken,
} from "@/api/client";
import { getMe, login as loginApi, type UserResponse } from "@/api/auth";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ error: null });
    try {
      const response = await loginApi(email, password);
      setToken(response.access_token);
      setRefreshToken(response.refresh_token);
      const user = await getMe();
      set({ user, isAuthenticated: true, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wystąpił błąd logowania";
      set({ error: message });
      throw err;
    }
  },

  logout: () => {
    removeTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      removeTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Listen for forced logout from API client (expired tokens, failed refresh)
window.addEventListener("auth:logout", () => {
  useAuthStore.getState().logout();
});
