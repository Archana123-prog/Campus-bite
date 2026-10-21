import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import StatusBadge from '../components/ui/StatusBadge';
import Spinner from '../components/ui/Spinner';
import { ORDER_TYPES } from '../utils/constants';
import { rupees, dateTimeOf } from '../utils/format';

export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data)).catch((e) => setError(e.message));
    // The server only pushes order_updated for rooms we joined (tracker page), so poll lightly here.
    const t = setInterval(() => api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {}), 15000);
    getSocket(); // make sure the connection (and auth) is warmed up
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold">My orders</h1>
      {error && <p className="mt-6 text-chili-500">{error}</p>}
      {!orders && !error && <Spinner />}
      {orders?.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <ReceiptText className="mx-auto text-ink-300" size={32} />
          <p className="mt-2 font-semibold">No orders yet.</p>
          <Link to="/menu" className="btn-primary mt-4">Browse the menu</Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {orders?.map((o) => (
          <li key={o.id}>
            <Link to={`/track/${o.id}`} className="card flex items-center gap-3 p-4 transition hover:border-brand-400">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">#{o.orderNumber}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-500 dark:text-ink-300">
                  {o.orderItems.map((i) => `${i.quantity}× ${i.menuItem?.name}`).join(', ')}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">{ORDER_TYPES[o.orderType].short} · {dateTimeOf(o.createdAt)}</p>
              </div>
              <span className="font-extrabold">{rupees(o.totalAmount)}</span>
              <ChevronRight size={18} className="text-ink-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
