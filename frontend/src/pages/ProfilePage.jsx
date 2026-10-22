import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Home,
  DoorClosed,
  ShoppingBag,
  Clock,
  CheckCircle,
  Save,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Utensils
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { useCartStore, selectCount, selectSubtotal } from '../store/useCartStore';
import { api } from '../services/api';
import { toast } from '../store/useToastStore';
import { toggleTheme, isDark } from '../utils/theme';
import { rupees, dateTimeOf } from '../utils/format';
import StatusBadge from '../components/ui/StatusBadge';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const hostelBlocks = useConfigStore((s) => s.hostelBlocks);
  const cartCount = useCartStore(selectCount);
  const cartSubtotal = useCartStore(selectSubtotal);
  const openCart = useCartStore((s) => s.openCart);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [hostelBlock, setHostelBlock] = useState(user?.hostelBlock || '');
  const [roomNumber, setRoomNumber] = useState(user?.roomNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [dark, setDark] = useState(isDark());

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setHostelBlock(user.hostelBlock || '');
      setRoomNumber(user.roomNumber || '');
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    api.get('/orders')
      .then(({ data }) => {
        if (alive) {
          setRecentOrders(data.slice(0, 3));
          setLoadingOrders(false);
        }
      })
      .catch(() => {
        if (alive) setLoadingOrders(false);
      });
    return () => { alive = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required.');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        hostelBlock: hostelBlock || null,
        roomNumber: roomNumber.trim() || null,
      });
      toast.success('Profile and delivery details updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully.');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            <User size={32} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Customer Profile</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            Please log in to manage your campus delivery address, track live orders, and customize your profile.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login" className="btn-primary w-full !py-3">Log In</Link>
            <Link to="/register" className="btn-ghost w-full !py-3">Create New Account</Link>
          </div>
        </div>
      </div>
    );
  }

  // Find any active order (PLACED, ACCEPTED, PREPARING, OUT_FOR_DELIVERY)
  const activeOrder = recentOrders.find(
    (o) => !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header Banner */}
      <div className="card overflow-hidden border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-white to-brand-50 dark:from-brand-500/15 dark:via-ink-900 dark:to-ink-900 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-400 text-2xl font-black text-ink-950 shadow-md ring-4 ring-white dark:ring-ink-800">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                  {user.fullName}
                </h1>
                <span className="chip bg-brand-500/20 text-brand-700 dark:bg-brand-500/30 dark:text-brand-300">
                  <ShieldCheck size={12} /> {user.role === 'ADMIN' ? 'Admin' : user.role === 'DELIVERY_RUNNER' ? 'Runner' : 'Customer'}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
                <Mail size={14} /> {user.email}
              </p>
              {user.hostelBlock && (
                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-400">
                  <Home size={13} /> {user.hostelBlock} {user.roomNumber ? `• Room ${user.roomNumber}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setDark(toggleTheme())}
              className="btn-ghost !px-3.5 !py-2 text-xs"
              title="Toggle theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
              <span>{dark ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn !bg-chili-500/10 !text-chili-600 hover:!bg-chili-500 hover:!text-white !px-3.5 !py-2 text-xs dark:!bg-chili-500/20 dark:!text-red-400"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Live Order or Cart Notice */}
      {activeOrder && (
        <div className="mt-6 rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 dark:border-brand-500/30 dark:bg-brand-500/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink-950 font-bold">
                <Clock size={20} className="animate-spin text-ink-950" style={{ animationDuration: '6s' }} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  Active Order #{activeOrder.orderNumber}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusBadge status={activeOrder.status} />
                  <span className="text-xs text-ink-500 dark:text-ink-300">
                    {activeOrder.orderItems?.length} items • {rupees(activeOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to={`/track/${activeOrder.id}`}
              className="btn-primary !py-2 !px-4 text-xs shrink-0 self-start sm:self-center"
            >
              Track Live Order <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {cartCount > 0 && (
        <div className="mt-4 rounded-2xl border border-leaf-500/30 bg-leaf-500/10 p-4 dark:border-leaf-500/30 dark:bg-leaf-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-500 text-white font-bold">
                <ShoppingBag size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900 dark:text-white">
                  Items waiting in your cart
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-300">
                  {cartCount} item{cartCount > 1 ? 's' : ''} • {rupees(cartSubtotal)}
                </p>
              </div>
            </div>
            <button onClick={openCart} className="btn-primary !bg-leaf-600 hover:!bg-leaf-500 !text-white !py-2 !px-4 text-xs">
              Complete Order
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: Edit Delivery Profile & Details */}
        <section className="card p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4 dark:border-ink-800">
            <div>
              <h2 className="font-display text-lg font-bold">Delivery & Contact Details</h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Prefilled automatically when you order hot food to your hostel room.
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <Home size={18} />
            </span>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="profile-fullName">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="profile-fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input pl-10"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="profile-email">
                  Email (Cannot be changed)
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={user.email}
                    className="input pl-10 opacity-70 cursor-not-allowed bg-ink-50 dark:bg-ink-800/60"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="profile-phone">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="profile-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input pl-10"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4 dark:border-ink-800 dark:bg-ink-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                Default Hostel Address for Room Delivery
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                <div>
                  <label className="label" htmlFor="profile-hostelBlock">
                    Hostel Block
                  </label>
                  <select
                    id="profile-hostelBlock"
                    value={hostelBlock}
                    onChange={(e) => setHostelBlock(e.target.value)}
                    className="input"
                  >
                    <option value="">Select hostel block…</option>
                    {hostelBlocks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="profile-roomNumber">
                    Room Number
                  </label>
                  <div className="relative">
                    <DoorClosed size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      id="profile-roomNumber"
                      type="text"
                      maxLength={10}
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. 204"
                      className="input pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary !px-6 !py-3"
              >
                <Save size={16} />
                {isSaving ? 'Saving Changes…' : 'Save Details'}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Quick shortcuts & Order History snippet */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <section className="card p-5">
            <h3 className="font-display text-base font-bold">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <Link
                to="/menu"
                className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm font-semibold transition hover:border-brand-500 hover:bg-brand-500/5 dark:border-ink-800"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400">
                    <Utensils size={15} />
                  </span>
                  Explore Canteen Menu
                </span>
                <ChevronRight size={16} className="text-ink-400" />
              </Link>

              <button
                type="button"
                onClick={openCart}
                className="flex w-full items-center justify-between rounded-xl border border-ink-100 p-3 text-sm font-semibold transition hover:border-brand-500 hover:bg-brand-500/5 dark:border-ink-800"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white dark:bg-white dark:text-ink-950">
                    <ShoppingBag size={15} />
                  </span>
                  View / Open Cart {cartCount > 0 && `(${cartCount})`}
                </span>
                <ChevronRight size={16} className="text-ink-400" />
              </button>

              <Link
                to="/orders"
                className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm font-semibold transition hover:border-brand-500 hover:bg-brand-500/5 dark:border-ink-800"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-leaf-500/20 text-leaf-600 dark:text-leaf-400">
                    <CheckCircle size={15} />
                  </span>
                  View All Past Orders
                </span>
                <ChevronRight size={16} className="text-ink-400" />
              </Link>
            </div>
          </section>

          {/* Recent Orders Overview */}
          <section className="card p-5">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
              <h3 className="font-display text-base font-bold">Recent Orders</h3>
              <Link to="/orders" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400">
                See all
              </Link>
            </div>

            {loadingOrders ? (
              <div className="py-6 text-center text-xs text-ink-400">Loading orders…</div>
            ) : recentOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-400">
                No orders placed yet. Grab something tasty from the menu!
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/track/${o.id}`}
                      className="block rounded-xl bg-ink-50 p-2.5 transition hover:bg-ink-100 dark:bg-ink-800 dark:hover:bg-ink-700"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">#{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-300">
                        {o.orderItems?.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ')}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-400">
                        <span>{dateTimeOf(o.createdAt)}</span>
                        <span className="font-bold text-ink-800 dark:text-ink-100">{rupees(o.totalAmount)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
