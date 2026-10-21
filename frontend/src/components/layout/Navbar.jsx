import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, User, Moon, Sun, ChefHat, Bike, ReceiptText, UtensilsCrossed, Download } from 'lucide-react';
import { useCartStore, selectCount } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePwaStore } from '../../store/usePwaStore';
import { toggleTheme, isDark } from '../../utils/theme';

const linkCls = ({ isActive }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const count = useCartStore(selectCount);
  const openCart = useCartStore((s) => s.openCart);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [dark, setDark] = React.useState(isDark());
  const isInstalled = usePwaStore((s) => s.isInstalled);
  const promptInstall = usePwaStore((s) => s.promptInstall);

  const links = (
    <>
      <NavLink to="/menu" className={linkCls}><UtensilsCrossed size={16} /> Menu</NavLink>
      {user && <NavLink to="/orders" className={linkCls}><ReceiptText size={16} /> My orders</NavLink>}
      {user?.role === 'ADMIN' && <NavLink to="/admin" className={linkCls}><ChefHat size={16} /> Kitchen</NavLink>}
      {(user?.role === 'DELIVERY_RUNNER' || user?.role === 'ADMIN') && (
        <NavLink to="/delivery" className={linkCls}><Bike size={16} /> Deliveries</NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-ink-50/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="CampusBite home">
          <img
            src="/pwa-192x192.png"
            alt="CampusBite icon"
            className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-brand-500/20 object-cover"
          />
          <span className="font-display text-xl font-extrabold tracking-tight">
            Campus<span className="text-brand-600 dark:text-brand-400">Bite</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="flex items-center gap-1.5">
          {!isInstalled && (
            <button
              onClick={() => promptInstall()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500/20 dark:text-brand-400"
              title="Install CampusBite as a Standalone App"
            >
              <Download size={14} /> Install App
            </button>
          )}

          <button
            onClick={() => setDark(toggleTheme())}
            className="rounded-xl p-2.5 text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={openCart} className="relative rounded-xl bg-ink-900 p-2.5 text-white hover:bg-ink-700 dark:bg-white dark:text-ink-900" aria-label={`Open cart, ${count} items`}>
            <ShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-ink-950">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <>
              <span className="hidden max-w-24 truncate pl-1 text-sm font-semibold sm:inline">{user.fullName.split(' ')[0]}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="rounded-xl p-2.5 text-ink-400 hover:bg-ink-100 hover:text-chili-500 dark:hover:bg-ink-800"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary !px-3.5 !py-2"><User size={15} /> Log in</Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center justify-between gap-1 overflow-x-auto border-t border-ink-100 px-4 py-1.5 scrollbar-none dark:border-ink-800 md:hidden">
        <div className="flex items-center gap-1">{links}</div>
        {!isInstalled && (
          <button
            onClick={() => promptInstall()}
            className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-600 shrink-0 dark:text-brand-400"
          >
            <Download size={13} /> Install
          </button>
        )}
      </nav>
    </header>
  );
}
