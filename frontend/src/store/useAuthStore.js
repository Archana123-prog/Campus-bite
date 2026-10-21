import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { resetSocket } from '../services/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ token: data.token, user: data.user });
        resetSocket();
        return data.user;
      },

      register: async (form) => {
        const { data } = await api.post('/auth/register', form);
        set({ token: data.token, user: data.user });
        resetSocket();
        return data.user;
      },

      updateProfile: async (changes) => {
        const { data } = await api.put('/auth/me', changes);
        set({ user: data });
        return data;
      },

      logout: () => {
        if (!get().token) return;
        set({ token: null, user: null });
        resetSocket();
      },
    }),
    { name: 'campusbite-auth' }
  )
);

export const isStaff = (user) => user?.role === 'ADMIN' || user?.role === 'DELIVERY_RUNNER';
