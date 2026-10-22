import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { useConfigStore } from './useConfigStore';

export const selectCount = (s) => s.cart.reduce((n, i) => n + i.quantity, 0);
export const selectSubtotal = (s) => s.cart.reduce((n, i) => n + i.price * i.quantity, 0);

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],
      orderType: 'HOSTEL_DELIVERY', // DINE_IN | HOSTEL_DELIVERY | TAKEAWAY
      tableNumber: '',
      hostelBlock: '',
      roomNumber: '',
      paymentMethod: 'CASH',
      notes: '',
      isOpen: false,
      isPlacing: false,
      error: null,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      setOrderType: (orderType) => set({ orderType, error: null }),
      setTableNumber: (tableNumber) => set({ tableNumber }),
      setHostel: (hostelBlock, roomNumber) => set({ hostelBlock, roomNumber }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setNotes: (notes) => set({ notes }),
      setError: (error) => set({ error }),

      addItem: (item, quantity = 1) => {
        const cart = get().cart;
        const found = cart.find((i) => i.menuItemId === item.id);
        if (found) {
          set({
            cart: cart.map((i) =>
              i.menuItemId === item.id ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              {
                menuItemId: item.id,
                name: item.name,
                price: Number(item.price),
                imageUrl: item.imageUrl,
                quantity,
              },
            ],
          });
        }
      },

      buyNow: (item, quantity = 1) => {
        const cart = get().cart;
        const found = cart.find((i) => i.menuItemId === item.id);
        let newCart;
        if (found) {
          newCart = cart.map((i) =>
            i.menuItemId === item.id ? { ...i, quantity: Math.max(i.quantity, quantity) } : i
          );
        } else {
          newCart = [
            ...cart,
            {
              menuItemId: item.id,
              name: item.name,
              price: Number(item.price),
              imageUrl: item.imageUrl,
              quantity,
            },
          ];
        }
        set({ cart: newCart, error: null });
      },

      reorder: (order) => {
        const cartItems = (order.orderItems || []).map((i) => ({
          menuItemId: i.menuItemId || i.menuItem?.id,
          name: i.menuItem?.name || 'Dish',
          price: Number(i.unitPrice || i.price || i.menuItem?.price || 0),
          imageUrl: i.menuItem?.imageUrl,
          quantity: i.quantity || 1,
        }));
        set({
          cart: cartItems,
          orderType: order.orderType || 'HOSTEL_DELIVERY',
          hostelBlock: order.hostelBlock || '',
          roomNumber: order.roomNumber || '',
          tableNumber: order.tableNumber || '',
          paymentMethod: order.paymentMethod || 'CASH',
          notes: order.notes || '',
          error: null,
        });
      },

      setQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) return get().removeItem(menuItemId);
        set({
          cart: get().cart.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity: Math.min(20, quantity) } : i
          ),
        });
      },

      removeItem: (menuItemId) => set({ cart: get().cart.filter((i) => i.menuItemId !== menuItemId) }),
      clearCart: () => set({ cart: [], notes: '', error: null }),

      /** Returns { ok: true, order } or { ok: false, error } */
      placeOrder: async () => {
        const s = get();
        if (s.cart.length === 0) return fail(set, 'Your cart is empty.');
        if (s.orderType === 'DINE_IN' && !s.tableNumber.trim()) return fail(set, 'Enter your table number.');
        if (s.orderType === 'HOSTEL_DELIVERY' && (!s.hostelBlock || !s.roomNumber.trim())) {
          return fail(set, 'Select your hostel block and enter your room number.');
        }

        set({ isPlacing: true, error: null });
        try {
          const { data } = await api.post('/orders', {
            orderType: s.orderType,
            tableNumber: s.orderType === 'DINE_IN' ? s.tableNumber.trim() : undefined,
            hostelBlock: s.orderType === 'HOSTEL_DELIVERY' ? s.hostelBlock : undefined,
            roomNumber: s.orderType === 'HOSTEL_DELIVERY' ? s.roomNumber.trim() : undefined,
            paymentMethod: s.paymentMethod,
            notes: s.notes,
            items: s.cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          });
          set({ cart: [], notes: '', isPlacing: false, isOpen: false });
          return { ok: true, order: data };
        } catch (err) {
          return fail(set, err.message, { isPlacing: false });
        }
      },
    }),
    {
      name: 'campusbite-cart',
      partialize: (s) => ({
        cart: s.cart,
        orderType: s.orderType,
        tableNumber: s.tableNumber,
        hostelBlock: s.hostelBlock,
        roomNumber: s.roomNumber,
        paymentMethod: s.paymentMethod,
      }),
    }
  )
);

function fail(set, error, extra = {}) {
  set({ error, ...extra });
  return { ok: false, error };
}

export const deliveryFeeFor = (orderType) =>
  orderType === 'HOSTEL_DELIVERY' ? useConfigStore.getState().deliveryFee : 0;
