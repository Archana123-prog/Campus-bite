import React, { useEffect, useState } from 'react';
import { IndianRupee, ReceiptText, Flame, Bike, Armchair, ShoppingBag } from 'lucide-react';
import { api } from '../../services/api';
import { rupees } from '../../utils/format';
import Spinner from '../ui/Spinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api.get('/admin/stats').then(({ data }) => setStats(data)).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (error) return <p className="text-chili-500">{error}</p>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'Revenue today', value: rupees(stats.todayRevenue), icon: IndianRupee },
    { label: 'Orders today', value: stats.todayOrders, icon: ReceiptText },
    { label: 'Active right now', value: stats.activeOrders, icon: Flame },
  ];
  const types = [
    { key: 'HOSTEL_DELIVERY', label: 'Hostel delivery', icon: Bike },
    { key: 'DINE_IN', label: 'Dine-in', icon: Armchair },
    { key: 'TAKEAWAY', label: 'Pickup', icon: ShoppingBag },
  ];
  const max = Math.max(1, ...stats.topItems.map((t) => t.quantity));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-ink-950"><Icon size={22} /></span>
            <div>
              <p className="text-2xl font-extrabold">{value}</p>
              <p className="text-xs text-ink-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display text-lg font-bold">Today by order type</h3>
          <ul className="mt-3 space-y-3">
            {types.map(({ key, label, icon: Icon }) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Icon size={16} className="text-ink-400" /> {label}</span>
                <b>{stats.byType[key] || 0}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="font-display text-lg font-bold">Top dishes this week</h3>
          {stats.topItems.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {stats.topItems.map((t) => (
                <li key={t.menuItemId}>
                  <div className="flex justify-between text-sm"><span>{t.name}</span><b>{t.quantity}</b></div>
                  <div className="mt-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(t.quantity / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
