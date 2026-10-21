import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, Bike, PackageCheck, Clock } from 'lucide-react';
import { api } from '../services/api';
import { getSocket, onConnected } from '../services/socket';
import { toast } from '../store/useToastStore';
import { rupees, timeAgo } from '../utils/format';
import Spinner from '../components/ui/Spinner';

function DeliveryCard({ order, children }) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between">
        <span className="font-display text-xl font-extrabold">#{order.orderNumber}</span>
        <span className="flex items-center gap-1 text-xs text-ink-400"><Clock size={12} /> {timeAgo(order.createdAt)}</span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 font-bold"><MapPin size={15} className="text-violet-500" /> {order.hostelBlock}, Room {order.roomNumber}</p>
      <a href={`tel:${order.user?.phone}`} className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500 hover:underline">
        <Phone size={13} /> {order.user?.fullName} · {order.user?.phone}
      </a>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{order.orderItems.map((i) => `${i.quantity}× ${i.menuItem?.name}`).join(', ')}</p>
      <p className="mt-2 text-sm font-bold">
        {order.paymentStatus === 'COMPLETED' ? 'Already paid' : `Collect ${rupees(order.totalAmount)} (${order.paymentMethod})`}
      </p>
      <div className="mt-3">{children}</div>
    </article>
  );
}

export default function DeliveryPage() {
  const [queue, setQueue] = useState(null);

  const load = useCallback(() => {
    api.get('/delivery/queue').then(({ data }) => setQueue(data)).catch((e) => { toast.error(e.message); setQueue((q) => q ?? { available: [], mine: [] }); });
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('order_updated', load);
    const offConnect = onConnected(socket, () => { socket.emit('join_delivery'); load(); });
    return () => { socket.off('order_updated', load); offConnect(); };
  }, [load]);

  const act = async (id, action) => {
    try {
      const res = await api.post(`/delivery/${id}/${action}`);
      toast.success(res.message);
    } catch (e) {
      toast.error(e.message);
    }
    load();
  };

  if (!queue) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold"><Bike /> Deliveries</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold">Ready for pickup ({queue.available.length})</h2>
          <div className="space-y-3">
            {queue.available.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">No orders waiting. New ones appear here instantly.</p>}
            {queue.available.map((o) => (
              <DeliveryCard key={o.id} order={o}>
                <button onClick={() => act(o.id, 'accept')} className="btn-primary w-full"><Bike size={16} /> Accept delivery</button>
              </DeliveryCard>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-bold">My active deliveries ({queue.mine.length})</h2>
          <div className="space-y-3">
            {queue.mine.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">You have nothing on the road.</p>}
            {queue.mine.map((o) => (
              <DeliveryCard key={o.id} order={o}>
                <button onClick={() => act(o.id, 'complete')} className="btn-dark w-full"><PackageCheck size={16} /> Mark delivered</button>
              </DeliveryCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
