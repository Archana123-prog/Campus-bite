import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Armchair, ShoppingBag, ArrowRight, Zap } from 'lucide-react';
import SwipeCardStack from '../components/home/SwipeCardStack';
import { useCartStore } from '../store/useCartStore';
import { useConfigStore } from '../store/useConfigStore';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from '../store/useToastStore';
import { rupees } from '../utils/format';

const MODES = [
  { type: 'HOSTEL_DELIVERY', icon: Bike, title: 'To my hostel', text: 'Pick your block and room. A runner brings it to your door.' },
  { type: 'DINE_IN', icon: Armchair, title: 'To my table', text: 'Sitting in the canteen? Order from your seat, we bring it over.' },
  { type: 'TAKEAWAY', icon: ShoppingBag, title: 'I’ll pick it up', text: 'Order from class and collect it hot at the counter.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState(null);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const deliveryFee = useConfigStore((s) => s.deliveryFee);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/menu/featured')
        .then(({ data }) => alive && setFeatured(data))
        .catch(() => alive && setFeatured((f) => f ?? []));
    load();
    // keep specials in sync when the kitchen marks something sold out
    const socket = getSocket();
    socket.on('menu_updated', load);
    return () => { alive = false; socket.off('menu_updated', load); };
  }, []);

  const handleAdd = (item) => {
    addItem(item, 1);
    toast.success(`${item.name} added`);
  };

  const chooseMode = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="chip bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300">
            <Zap size={12} /> Skip the canteen queue
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Hot food from the canteen, at your table or your hostel door.
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-500 dark:text-ink-300">
            Order between classes. Boys and girls hostels, day scholars and staff all use the same menu.
            Delivery is just {rupees(deliveryFee)}.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-primary !px-6 !py-3.5 text-base">Browse the menu <ArrowRight size={18} /></Link>
            <button onClick={openCart} className="btn-ghost !px-6 !py-3.5 text-base">View cart</button>
          </div>
        </div>

        <div className="pt-2">
          {featured === null ? (
            <div className="mx-auto h-[430px] w-[min(86vw,320px)] animate-pulse rounded-[28px] bg-ink-100 dark:bg-ink-800" />
          ) : (
            <SwipeCardStack items={featured} onAdd={handleAdd} onOpenCart={openCart} />
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold">How do you want it?</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {MODES.map(({ type, icon: Icon, title, text }) => (
            <button
              key={type}
              onClick={() => chooseMode(type)}
              className="card group p-5 text-left transition hover:border-brand-400 hover:shadow-lg dark:hover:border-brand-500"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-brand-400 dark:bg-brand-500 dark:text-ink-950">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700 transition group-hover:gap-2 dark:text-brand-400">
                Choose <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
