import { create } from 'zustand';
import { api } from '../services/api';

/** Canteen settings come from the backend (.env), with safe fallbacks if the API is down. */
export const useConfigStore = create((set) => ({
  deliveryFee: 10,
  tableCount: 20,
  hostelBlocks: ['Boys Hostel Block A', 'Boys Hostel Block B', 'Girls Hostel Block A', 'Girls Hostel Block B'],
  upiId: 'hayaarav@fam',
  upiName: 'Pet Pooja',
  // Razorpay public key — populated from backend /config so it doesn't need to be in the frontend .env
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || null,
  loaded: false,
  load: async () => {
    try {
      const { data } = await api.get('/config');
      set({ ...data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
