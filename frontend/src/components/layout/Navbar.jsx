import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ShoppingBag,
  ChefHat,
  Bike,
  ReceiptText,
  UtensilsCrossed,
  Home,
  User,
  Download,
  Sparkles
} from 'lucide-react';
import { useCartStore, selectCount, selectSubtotal } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePwaStore } from '../../store/usePwaStore';
import { rupees } from '../../utils/format';
import ProfileDropdown from './ProfileDropdown';

const linkCls = ({ isActive }) =>
  `flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
    isActive
      ? 'bg-ink-900 text-white shadow-sm dark:bg-white dark:text-ink-950'
      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white'
  }`;

export default function Navbar() {
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const openCart = useCartStore((s) => s.openCart);
  const user = useAuthStore((s) => s.user);
  const isInstalled = usePwaStore((s) => s.isInstalled);
  const promptInstall = usePwaStore((s) => s.promptInstall);

  const customerLinks = (
    <>
      <NavLink to="/" className={linkCls}>
        <Home size={16} /> Home
      </NavLink>
      <NavLink to="/menu" className={linkCls}>
        <UtensilsCrossed size={16} /> Menu
      </NavLink>
      {user && (
        <NavLink to="/orders" className={linkCls}>
          <ReceiptText size={16} /> My Orders
        </NavLink>
      )}
      {user && (
        <NavLink to="/profile" className={linkCls}>
          <User size={16} /> Profile
        </NavLink>
      )}
      {user?.role === 'ADMIN' && (
        <NavLink to="/admin" className={linkCls}>
          <ChefHat size={16} /> Kitchen
        </NavLink>
      )}
      {(user?.role === 'DELIVERY_RUNNER' || user?.role === 'ADMIN') && (
        <NavLink to="/delivery" className={linkCls}>
          <Bike size={16} /> Deliveries
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-md shadow-xs dark:border-ink-800 dark:bg-ink-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Pet Pooja home">
          <div className="relative">
            <img
              src="/pet-pooja-logo.png"
              alt="Pet Pooja"
              className="h-12 w-14 rounded-lg object-contain transition group-hover:scale-105 sm:w-[72px]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-leaf-500 ring-2 ring-white dark:ring-ink-950" title="Canteen Open" />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-300">
              Canteen & Hostels
            </span>
          </div>
        </Link>

        {/* Customer Nav Links (Desktop) */}
        <nav className="hidden items-center gap-1 md:flex">
          {customerLinks}
        </nav>

        {/* Action Controls: Card/Cart Section, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Install App button if available */}
          {!isInstalled && (
            <button
              onClick={() => promptInstall()}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500/20 dark:text-brand-400"
              title="Install Pet Pooja as a Standalone App"
            >
              <Download size={14} /> Install
            </button>
          )}


          {/* CARD / CART ORDER SECTION: Prominent customer order button */}
          <button
            onClick={openCart}
            className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 font-bold transition active:scale-95 shadow-sm ${
              count > 0
                ? 'bg-brand-500 text-ink-950 hover:bg-brand-400 ring-2 ring-brand-500/30'
                : 'bg-ink-900 text-white hover:bg-ink-700 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100'
            }`}
            aria-label={`Open cart, ${count} items. Order now`}
          >
            <div className="relative">
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -right-2.5 -top-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink-950 px-1 text-[10px] font-black text-white">
                  {count}
                </span>
              )}
            </div>

            <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
              <span>Order</span>
              {count > 0 && (
                <span className="opacity-90 font-mono text-xs">
                  • {rupees(subtotal)}
                </span>
              )}
            </span>

            {count > 0 && (
              <span className="hidden sm:inline-block ml-0.5 h-2 w-2 rounded-full bg-leaf-500 animate-ping2" />
            )}
          </button>

          {/* CUSTOMER PROFILE SECTION */}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
