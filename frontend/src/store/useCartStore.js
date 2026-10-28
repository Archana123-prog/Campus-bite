import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      notes: '',
      isOpen: false,
      isPlacing: false,
      error: null,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      setOrderType: (orderType) => set({ orderType, error: null }),
      setTableNumber: (tableNumber) => set({ tableNumber }),
      setHostel: (hostelBlock, roomNumber) => set({ hostelBlock, roomNumber }),
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

    }),
    {
      name: 'campusbite-cart',
      version: 1,
      migrate: (persistedState) => {
        const state = { ...persistedState };
        delete state.paymentMethod;
        return state;
      },
      partialize: (s) => ({
        cart: s.cart,
        orderType: s.orderType,
        tableNumber: s.tableNumber,
        hostelBlock: s.hostelBlock,
        roomNumber: s.roomNumber,
      }),
    }
  )
);

export const deliveryFeeFor = (orderType) =>
  orderType === 'HOSTEL_DELIVERY' ? useConfigStore.getState().deliveryFee : 0;
