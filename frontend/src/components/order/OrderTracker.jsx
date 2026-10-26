import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MapPin, Armchair, ShoppingBag, Clock, XCircle, Phone, QrCode } from 'lucide-react';
import { api } from '../../services/api';
import { getSocket, onConnected } from '../../services/socket';
import { TIMELINE, STEP_LABEL, ORDER_TYPES } from '../../utils/constants';
import { rupees, timeOf, estimateReadyAt } from '../../utils/format';
import { toast } from '../../store/useToastStore';
import Spinner from '../ui/Spinner';
import UpiScannerModal from '../payment/UpiScannerModal';

export default function OrderTracker({ orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    let alive = true;
    setOrder(null);
    setError('');
    api.get(`/orders/${orderId}`)
      .then(({ data }) => alive && setOrder(data))
      .catch((e) => alive && setError(e.message));

    const socket = getSocket();
    const onUpdate = (o) => o.id === orderId && setOrder(o);
    socket.on('order_updated', onUpdate);
    const offConnect = onConnected(socket, () => socket.emit('track_order', orderId));
    return () => {
      alive = false;
      socket.off('order_updated', onUpdate);
      offConnect();
    };
  }, [orderId]);

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const { data } = await api.patch(`/orders/${orderId}/cancel`);
      setOrder(data);
      toast.success('Order cancelled.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  if (error) return <p className="py-16 text-center font-semibold text-chili-500">{error}</p>;
  if (!order) return <Spinner label="Loading your order…" />;

  const steps = TIMELINE[order.orderType];
  const labels = STEP_LABEL[order.orderType];
  const cancelled = order.status === 'CANCELLED';
  const current = steps.indexOf(order.status);
  const done = order.status === 'SERVED';
  const eta = estimateReadyAt(order);

  const where =
    order.orderType === 'DINE_IN' ? { icon: Armchair, text: `Table ${order.tableNumber}` }
    : order.orderType === 'HOSTEL_DELIVERY' ? { icon: MapPin, text: `${order.hostelBlock}, Room ${order.roomNumber}` }
    : { icon: ShoppingBag, text: 'Collect at the counter' };
  const WhereIcon = where.icon;

  return (
    <div className="card mx-auto max-w-md overflow-hidden shadow-xl">
      <div className="bg-ink-900 p-5 text-white">
        <div className="flex items-center justify-between text-xs text-ink-300">
          <span>{ORDER_TYPES[order.orderType].label}</span>
          {!done && !cancelled && (
            <span className="flex items-center gap-1.5 font-semibold text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-brand-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              Live
            </span>
          )}
        </div>
        <p className="mt-1 font-display text-4xl font-extrabold">Order #{order.orderNumber}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-200"><WhereIcon size={15} /> {where.text}</p>
        {!done && !cancelled && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-200"><Clock size={15} /> Expected around {timeOf(eta)}</p>
        )}
      </div>

      <div className="p-5">
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-xl bg-chili-500/10 p-4 text-chili-600 dark:text-red-300">
            <XCircle /> <p className="text-sm font-semibold">This order was cancelled.</p>
          </div>
        ) : (
          <ol className="space-y-0">
            {steps.map((step, i) => {
              const complete = i < current || done;
              const active = i === current && !done;
              return (
                <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${complete ? 'bg-leaf-500' : 'bg-ink-100 dark:bg-ink-700'}`} />
                  )}
                  <span
                    className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      complete ? 'bg-leaf-500 text-white'
                      : active ? 'bg-brand-500 text-ink-950 ring-4 ring-brand-500/25'
                      : 'bg-ink-100 text-ink-400 dark:bg-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {complete ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <p className={`pt-1 text-sm ${active ? 'font-bold' : complete ? 'font-semibold' : 'text-ink-400 dark:text-ink-300'}`}>{labels[step]}</p>
                </li>
              );
            })}
          </ol>
        )}

        {order.runner && order.status === 'OUT_FOR_DELIVERY' && (
          <a href={`tel:${order.runner.phone}`} className="mt-4 flex items-center justify-between rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-500/10">
            <span><span className="font-bold">{order.runner.fullName}</span> is bringing your food</span>
            <span className="flex items-center gap-1 font-bold text-violet-700 dark:text-violet-300"><Phone size={14} /> Call</span>
          </a>
        )}

        <div className="mt-6 rounded-xl bg-ink-50 p-4 dark:bg-ink-800">
          <ul className="space-y-1.5 text-sm">
            {order.orderItems.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.quantity} × {i.menuItem?.name}</span>
                <span className="font-semibold">{rupees(Number(i.unitPrice) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {Number(order.deliveryFee) > 0 && (
            <div className="mt-2 flex justify-between text-sm text-ink-500 dark:text-ink-300"><span>Delivery</span><span>{rupees(order.deliveryFee)}</span></div>
          )}
          <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 font-extrabold dark:border-ink-700">
            <span>Total</span><span>{rupees(order.totalAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-400 dark:text-ink-300">
            {order.paymentStatus === 'COMPLETED' ? 'Paid' : `Pay ${order.paymentMethod === 'UPI' ? 'by UPI' : 'with cash'} on handover`}
          </p>
          {order.notes && <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">Note: “{order.notes}”</p>}
        </div>

        {order.paymentMethod === 'UPI' && order.paymentStatus !== 'COMPLETED' && !cancelled && (
          <div className="mt-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-ink-950 font-bold shadow-xs">
                  <QrCode size={18} />
                </span>
                <div>
                  <p className="font-extrabold text-ink-900 dark:text-white">Pay with Canteen UPI Scanner</p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-300">Archana Kumari • 7488325002@upi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="rounded-xl bg-brand-500 px-3 py-1.5 font-black text-ink-950 text-xs shadow-sm hover:bg-brand-400 transition"
              >
                Scan & Pay
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {order.status === 'PENDING' && (
            <button onClick={cancel} disabled={cancelling} className="btn-ghost flex-1 !text-chili-600">Cancel order</button>
          )}
          <Link to="/orders" className="btn-ghost flex-1">All my orders</Link>
          {(done || cancelled) && <Link to="/menu" className="btn-primary flex-1">Order again</Link>}
        </div>
      </div>

      {showScanner && (
        <UpiScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          amount={order.totalAmount}
          showUtrInput={false}
        />
      )}
    </div>
  );
}
