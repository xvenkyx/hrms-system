import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, LoginRequest, LoginResponse } from '../types';
import { STORAGE_KEYS } from '../constants';
import api from '../lib/api';

interface AuthState {
  employee: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employee: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await api.post<LoginResponse>('/auth/login', credentials);
          const { access_token, employee } = response.data;
          
          // Store token in localStorage
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
          
          set({
            employee,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        set({
          employee: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      getProfile: async () => {
        try {
          const response = await api.get<Employee>('/auth/profile');
          set({ employee: response.data });
        } catch (error) {
          // If profile fetch fails, logout user
          get().logout();
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: STORAGE_KEYS.USER_DATA,
      partialize: (state) => ({
        employee: state.employee,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);