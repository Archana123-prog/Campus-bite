import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, ReceiptText, User } from 'lucide-react';
import { useCartStore, selectCount, selectSubtotal } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { rupees } from '../../utils/format';

export default function MobileBottomNav() {
  const location = useLocation();
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const openCart = useCartStore((s) => s.openCart);
  const user = useAuthStore((s) => s.user);

  // If on admin or delivery dashboard full screen, we can keep or adjust
  const isAdminOrDelivery = location.pathname.startsWith('/admin') || location.pathname.startsWith('/delivery');
  if (isAdminOrDelivery) return null;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-ink-100 bg-white/95 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/95 px-3 py-2 shadow-lg"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {/* Home / Card Swiper */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200'
            }`
          }
        >
          <Home size={20} />
          <span>Home</span>
        </NavLink>

        {/* Menu */}
        <NavLink
          to="/menu"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200'
            }`
          }
        >
          <UtensilsCrossed size={20} />
          <span>Menu</span>
        </NavLink>

        {/* Center Prominent Card / Cart Order Button */}
        <button
          onClick={openCart}
          className="relative -mt-5 flex flex-col items-center justify-center"
          aria-label={`Open Cart and Order (${count} items)`}
        >
          <div className="relative grid h-13 w-13 place-items-center rounded-full bg-brand-500 text-ink-950 shadow-lg shadow-brand-500/30 transition active:scale-95 ring-4 ring-white dark:ring-ink-950">
            <ShoppingBag size={22} strokeWidth={2.4} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[10px] font-black text-white dark:bg-white dark:text-ink-950 ring-2 ring-brand-500">
                {count}
              </span>
            )}
          </div>
          <span className="mt-1 text-[10px] font-extrabold text-brand-600 dark:text-brand-400">
            {count > 0 ? rupees(subtotal) : 'Order'}
          </span>
        </button>

        {/* My Orders */}
        <NavLink
          to={user ? '/orders' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200'
            }`
          }
        >
          <ReceiptText size={20} />
          <span>Orders</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to={user ? '/profile' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200'
            }`
          }
        >
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
