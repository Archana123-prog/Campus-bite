import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ReceiptText,
  RotateCcw,
  Clock,
  Home,
  Armchair,
  ShoppingBag,
  Zap,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useCartStore } from '../store/useCartStore';
import { toast } from '../store/useToastStore';
import StatusBadge from '../components/ui/StatusBadge';
import Spinner from '../components/ui/Spinner';
import { ORDER_TYPES } from '../utils/constants';
import { rupees, dateTimeOf } from '../utils/format';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const reorder = useCartStore((s) => s.reorder);

  useEffect(() => {
    api.get('/orders')
      .then(({ data }) => setOrders(data))
      .catch((e) => setError(e.message));

    // Polling backup
    const t = setInterval(() => {
      api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {});
    }, 15000);

    getSocket();
    return () => clearInterval(t);
  }, []);

  const handleOrderAgain = (e, order) => {
    e.stopPropagation();
    e.preventDefault();

    if (!order.orderItems || order.orderItems.length === 0) {
      toast.error('Could not retrieve items from this past order.');
      return;
    }

    // Pre-fill the cart store with the exact previous products and order details
    reorder(order);

    toast.success(`Order #${order.orderNumber} re-created! Redirecting to payment…`);
    navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Order History</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Track past orders or reorder your favorite meals with one click.
          </p>
        </div>
        <Link to="/menu" className="btn-ghost !px-3 !py-2 text-xs font-bold hidden sm:inline-flex">
          Browse Menu
        </Link>
      </div>

      {error && <p className="mt-6 text-chili-500 font-semibold">{error}</p>}
      {!orders && !error && (
        <div className="py-16 text-center">
          <Spinner />
        </div>
      )}

      {orders?.length === 0 && (
        <div className="card mt-8 p-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
            <ReceiptText size={32} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">No orders placed yet</h2>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            When you order dishes, your receipts and live tracker will appear right here.
          </p>
          <Link to="/menu" className="btn-primary mt-5 !px-6 !py-3">
            Explore Menu & Order
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {orders?.map((o) => (
          <li key={o.id}>
            <div className="card overflow-hidden border border-ink-100 p-5 transition hover:border-brand-400 hover:shadow-md dark:border-ink-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left order details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-lg font-black tracking-tight">
                      #{o.orderNumber}
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-ink-400 font-semibold">
                      • {dateTimeOf(o.createdAt)}
                    </span>
                  </div>

                  {/* List of items */}
                  <div className="mt-2 text-sm text-ink-700 dark:text-ink-200">
                    <p className="font-semibold line-clamp-2">
                      {o.orderItems.map((i) => `${i.quantity}× ${i.menuItem?.name || 'Dish'}`).join(', ')}
                    </p>
                  </div>

                  {/* Delivery Location & Notes */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-400">
                    <span className="flex items-center gap-1">
                      {o.orderType === 'HOSTEL_DELIVERY' && <Home size={12} />}
                      {o.orderType === 'DINE_IN' && <Armchair size={12} />}
                      {o.orderType === 'TAKEAWAY' && <ShoppingBag size={12} />}
                      <span>
                        {ORDER_TYPES[o.orderType]?.label || o.orderType}
                        {o.hostelBlock ? ` (${o.hostelBlock} • Rm ${o.roomNumber})` : ''}
                        {o.tableNumber ? ` (Table ${o.tableNumber})` : ''}
                      </span>
                    </span>

                    <span>Payment: <strong className="text-ink-600 dark:text-ink-300">{o.paymentMethod}</strong></span>

                    {o.notes && (
                      <span className="truncate max-w-xs italic text-ink-400">
                        "{o.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Total Amount */}
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xs text-ink-400 block font-semibold">Total Paid</span>
                  <span className="font-display text-xl font-black text-ink-900 dark:text-white">
                    {rupees(o.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-4 pt-3 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between gap-3">
                <Link
                  to={`/track/${o.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
                >
                  <span>Track Status / View Receipt</span>
                  <ChevronRight size={14} />
                </Link>

                {/* MANDATORY ACTION: Order Again button redirecting to payment page with details prefilled */}
                <button
                  type="button"
                  onClick={(e) => handleOrderAgain(e, o)}
                  className="btn-primary !px-4 !py-2 text-xs font-black shadow-sm active:scale-95 flex items-center gap-1.5"
                  title="Reorder this exact meal and proceed directly to payment"
                >
                  <RotateCcw size={13} strokeWidth={2.6} />
                  <span>Order Again</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
