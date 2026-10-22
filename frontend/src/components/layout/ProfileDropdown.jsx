import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  ReceiptText,
  ShoppingBag,
  Home,
  ChefHat,
  Bike,
  ChevronDown,
  ShieldCheck,
  Download
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore, selectCount } from '../../store/useCartStore';
import { usePwaStore } from '../../store/usePwaStore';
import { toast } from '../../store/useToastStore';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const count = useCartStore(selectCount);
  const openCart = useCartStore((s) => s.openCart);
  const isInstalled = usePwaStore((s) => s.isInstalled);
  const promptInstall = usePwaStore((s) => s.promptInstall);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    toast.info('Logged out successfully.');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/login"
          className="btn-primary !px-3.5 !py-2 text-xs sm:text-sm font-bold shadow-sm"
        >
          <User size={15} /> Log in
        </Link>
        <Link
          to="/register"
          className="hidden sm:inline-flex btn-ghost !px-3 !py-2 text-xs font-semibold"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const displayName = user.fullName || user.name || user.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const firstName = displayName.split(' ')[0] || 'User';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-xl p-1.5 sm:px-2.5 sm:py-1.5 transition ${
          isOpen
            ? 'bg-ink-100 ring-2 ring-brand-500/30'
            : 'hover:bg-ink-100'
        }`}
        title="Customer Profile & Settings"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-brand-600 to-amber-400 font-display text-sm font-extrabold text-ink-950 shadow-sm">
          {initial}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-28 truncate text-xs font-bold leading-tight">{firstName}</p>
          <p className="text-[10px] text-ink-400">
            {user.role === 'ADMIN' ? 'Kitchen Admin' : user.role === 'DELIVERY_RUNNER' ? 'Runner' : 'Customer'}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-ink-100 bg-white p-2 shadow-2xl animate-pop z-50">
          {/* User card info */}
          <div className="rounded-xl bg-ink-50 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-amber-400 text-sm font-extrabold text-ink-950 shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink-900 dark:text-white">
                  {user.fullName || user.email || 'CampusBite Member'}
                </p>
                <p className="truncate text-[11px] text-ink-500 dark:text-ink-400">
                  {user.email}
                </p>
              </div>
            </div>

            {user.hostelBlock ? (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 text-[11px] font-semibold text-brand-700 dark:bg-ink-700/60 dark:text-brand-300">
                <Home size={12} className="shrink-0" />
                <span className="truncate">
                  {user.hostelBlock} {user.roomNumber ? `• Rm ${user.roomNumber}` : ''}
                </span>
              </div>
            ) : (
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="mt-2 block rounded-lg border border-dashed border-brand-500/40 bg-brand-500/5 px-2 py-1 text-center text-[11px] font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-400"
              >
                + Add default hostel & room
              </Link>
            )}
          </div>

          {/* Navigation Items */}
          <div className="mt-2 space-y-0.5 border-b border-ink-100 pb-2 dark:border-ink-800">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              <User size={15} className="text-brand-500" />
              <span>Customer Profile & Address</span>
            </Link>

            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              <span className="flex items-center gap-2.5">
                <ReceiptText size={15} className="text-brand-500" />
                <span>My Orders</span>
              </span>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                openCart();
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag size={15} className="text-brand-500" />
                <span>My Cart</span>
              </span>
              {count > 0 && (
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-ink-950">
                  {count} items
                </span>
              )}
            </button>
          </div>

          {/* Role specific quick links */}
          {(user.role === 'ADMIN' || user.role === 'DELIVERY_RUNNER') && (
            <div className="mt-1 space-y-0.5 border-b border-ink-100 pb-2 dark:border-ink-800">
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  <ChefHat size={15} className="text-amber-500" />
                  <span>Kitchen Dashboard</span>
                </Link>
              )}
              <Link
                to="/delivery"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                <Bike size={15} className="text-amber-500" />
                <span>Delivery Runner Mode</span>
              </Link>
            </div>
          )}

          {/* Quick Preferences */}
          <div className="mt-1 space-y-0.5 pt-1">
            {!isInstalled && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  promptInstall();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <Download size={15} />
                <span>Install Standalone App</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-chili-600 transition hover:bg-chili-500/10 dark:text-red-400 dark:hover:bg-chili-500/20"
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
