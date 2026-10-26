import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Armchair, MapPin, ShoppingBag, ChevronRight, Volume2, VolumeX, XCircle, Wifi, WifiOff } from 'lucide-react';
import { api } from '../../services/api';
import { getSocket, onConnected } from '../../services/socket';
import { toast } from '../../store/useToastStore';
import { rupees, timeAgo } from '../../utils/format';
import Spinner from '../ui/Spinner';

const COLUMNS = [
  { id: 'PENDING', title: 'New', tone: 'border-brand-500' },
  { id: 'PREPARING', title: 'Cooking', tone: 'border-sky-500' },
  { id: 'READY', title: 'Ready', tone: 'border-leaf-500' },
  { id: 'OUT_FOR_DELIVERY', title: 'Out for delivery', tone: 'border-violet-500' },
];

const nextStatus = (o) => {
  switch (o.status) {
    case 'PENDING': return { to: 'PREPARING', label: 'Start cooking' };
    case 'PREPARING': return { to: 'READY', label: 'Mark ready' };
    case 'READY':
      return o.orderType === 'HOSTEL_DELIVERY'
        ? { to: 'OUT_FOR_DELIVERY', label: 'Hand to runner' }
        : { to: 'SERVED', label: o.orderType === 'DINE_IN' ? 'Served at table' : 'Picked up' };
    case 'OUT_FOR_DELIVERY': return { to: 'SERVED', label: 'Delivered' };
    default: return null;
  }
};

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* audio not available */ }
}

export default function KitchenKDS() {
  const [orders, setOrders] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const [, tick] = useState(0);

  soundRef.current = sound;

  const upsert = useCallback((order) => {
    setOrders((prev) => {
      const list = prev || [];
      const rest = list.filter((o) => o.id !== order.id);
      if (order.status === 'SERVED' || order.status === 'CANCELLED') return rest;
      return [...rest, order].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  }, []);

  const loadActive = useCallback(() => {
    api.get('/orders?active=true')
      .then(({ data }) => setOrders([...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))))
      .catch((e) => { toast.error(e.message); setOrders((o) => o ?? []); });
  }, []);

  useEffect(() => {
    loadActive();
    const socket = getSocket();
    const onNew = (order) => {
      upsert(order);
      if (soundRef.current) beep();
      toast.info(`New order #${order.orderNumber}`);
    };
    const onUpdate = (order) => upsert(order);
    const onDisconnect = () => setConnected(false);

    socket.on('kds_new_order', onNew);
    socket.on('order_updated', onUpdate);
    socket.on('disconnect', onDisconnect);
    const offConnect = onConnected(socket, () => {
      setConnected(true);
      socket.emit('join_kitchen');
      loadActive(); // catch up on anything missed while offline
    });

    const clock = setInterval(() => tick((n) => n + 1), 30000); // refresh "x min ago"
    return () => {
      socket.off('kds_new_order', onNew);
      socket.off('order_updated', onUpdate);
      socket.off('disconnect', onDisconnect);
      offConnect();
      clearInterval(clock);
    };
  }, [loadActive, upsert]);

  const move = async (order, to) => {
    try {
      const { data } = await api.patch(`/orders/${order.id}/status`, { status: to });
      upsert(data);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const cancel = async (order) => {
    if (!window.confirm(`Cancel order #${order.orderNumber}?`)) return;
    try {
      const { data } = await api.patch(`/orders/${order.id}/cancel`);
      upsert(data);
      toast.success('Order cancelled.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!orders) return <Spinner label="Loading kitchen queue…" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Live orders</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">{orders.length} active · new orders appear instantly</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${connected ? 'bg-leaf-500/15 text-leaf-600 dark:text-emerald-300' : 'bg-chili-500/15 text-chili-600'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />} {connected ? 'Connected' : 'Reconnecting…'}
          </span>
          <button onClick={() => { setSound(!sound); if (!sound) beep(); }} className="btn-ghost !px-3 !py-2" aria-label="Toggle alert sound">
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.id);
          return (
            <section key={col.id} className="rounded-2xl bg-ink-100/70 p-3 dark:bg-ink-900">
              <h3 className={`mb-3 flex items-center justify-between border-l-4 pl-2 text-sm font-bold ${col.tone}`}>
                {col.title}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-ink-800">{list.length}</span>
              </h3>
              <div className="space-y-3">
                {list.length === 0 && <p className="py-6 text-center text-xs text-ink-400 dark:text-ink-300">Nothing here</p>}
                {list.map((o) => {
                  const action = nextStatus(o);
                  const late = Date.now() - new Date(o.createdAt).getTime() > 20 * 60000 && o.status !== 'OUT_FOR_DELIVERY';
                  return (
                    <article key={o.id} className={`card p-3.5 shadow-sm ${late ? 'ring-2 ring-chili-500/60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <span className="font-display text-xl font-extrabold">#{o.orderNumber}</span>
                        <span className={`flex items-center gap-1 text-[11px] ${late ? 'font-bold text-chili-500' : 'text-ink-400 dark:text-ink-300'}`}>
                          <Clock size={11} /> {timeAgo(o.createdAt)}
                        </span>
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                        {o.orderType === 'DINE_IN' && <><Armchair size={14} className="text-brand-600" /> Table {o.tableNumber}</>}
                        {o.orderType === 'HOSTEL_DELIVERY' && <><MapPin size={14} className="text-violet-500" /> {o.hostelBlock}, Rm {o.roomNumber}</>}
                        {o.orderType === 'TAKEAWAY' && <><ShoppingBag size={14} className="text-leaf-500" /> Pickup</>}
                      </p>
                      <p className="text-xs text-ink-400 dark:text-ink-300">{o.user?.fullName || 'Guest'} · {o.user?.phone}</p>

                      <ul className="mt-2.5 space-y-1 border-t border-ink-100 pt-2 text-sm dark:border-ink-700">
                        {o.orderItems.map((i) => (
                          <li key={i.id} className="flex gap-2"><b className="text-brand-700 dark:text-brand-400">{i.quantity}×</b> {i.menuItem?.name}</li>
                        ))}
                      </ul>
                      {o.notes && <p className="mt-2 rounded-lg bg-brand-50 px-2 py-1.5 text-xs text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">“{o.notes}”</p>}

                        <div className="mt-2 flex items-center justify-between text-xs text-ink-400 dark:text-ink-300">
                        <span>{rupees(o.totalAmount)} · {o.paymentMethod}</span>
                        {o.runner && <span className="flex items-center gap-1"><Bike size={12} className="text-brand-600" /> {o.runner.fullName}</span>}
                      </div>

                      <div className="mt-3 flex gap-2">
                        {action && o.status !== 'OUT_FOR_DELIVERY' && (
                          <button onClick={() => move(o, action.to)} className="btn-primary flex-1 !py-2 text-xs">
                            {action.label} <ChevronRight size={14} />
                          </button>
                        )}
                        {o.status === 'OUT_FOR_DELIVERY' && (
                          <button onClick={() => move(o, 'SERVED')} className="btn-ghost flex-1 !py-2 text-xs">Mark delivered</button>
                        )}
                        {o.status !== 'OUT_FOR_DELIVERY' && (
                          <button onClick={() => cancel(o)} className="btn-ghost !px-2.5 !py-2 !text-chili-500" aria-label={`Cancel order ${o.orderNumber}`}>
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
