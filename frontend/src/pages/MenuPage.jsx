import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, Plus, Minus, Clock, Flame, AlertCircle, Leaf } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useCartStore } from '../store/useCartStore';
import FoodImage from '../components/ui/FoodImage';
import VegMark from '../components/ui/VegMark';
import { rupees } from '../utils/format';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [categoryId, setCategoryId] = useState('ALL');
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | error

  const cart = useCartStore((s) => s.cart);
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const load = () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    Promise.all([api.get('/menu/categories'), api.get('/menu')])
      .then(([c, m]) => {
        setCategories(c.data.filter((cat) => cat._count.menuItems > 0));
        setItems(m.data);
        setState('ready');
      })
      .catch(() => setState('error'));
  };

  useEffect(load, []);

  // live sold-out updates from the kitchen
  useEffect(() => {
    const socket = getSocket();
    const onMenu = ({ itemId, isAvailable }) =>
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isAvailable } : i)));
    socket.on('menu_updated', onMenu);
    return () => socket.off('menu_updated', onMenu);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (categoryId === 'ALL' || i.categoryId === categoryId) &&
        (!vegOnly || i.isVeg) &&
        (!q || i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
    );
  }, [items, categoryId, query, vegOnly]);

  const qtyOf = (id) => cart.find((c) => c.menuItemId === id)?.quantity || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Canteen menu</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">Sold-out dishes update live.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dosa, chai, thali…"
              className="input pl-9 pr-9"
              aria-label="Search menu"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            aria-pressed={vegOnly}
            className={`btn !px-3 border ${vegOnly ? 'border-leaf-500 bg-leaf-500/10 text-leaf-600 dark:text-emerald-300' : 'border-ink-200 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'}`}
          >
            <Leaf size={16} /> Veg
          </button>
        </div>
      </div>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
        {[{ id: 'ALL', name: 'All' }, ...categories].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`btn shrink-0 !rounded-full !px-4 !py-2 ${
              categoryId === c.id
                ? 'bg-ink-900 text-white dark:bg-brand-500 dark:text-ink-950'
                : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {state === 'loading' && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-3">
              <div className="h-40 rounded-xl bg-ink-100 dark:bg-ink-800" />
              <div className="mt-3 h-4 w-3/4 rounded bg-ink-100 dark:bg-ink-800" />
              <div className="mt-2 h-3 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="card mt-8 p-10 text-center">
          <AlertCircle className="mx-auto text-chili-500" />
          <p className="mt-2 font-semibold">The menu could not be loaded.</p>
          <p className="text-sm text-ink-500">Check that the backend is running, then try again.</p>
          <button onClick={load} className="btn-dark mt-4">Try again</button>
        </div>
      )}

      {state === 'ready' && filtered.length === 0 && (
        <div className="card mt-8 p-10 text-center">
          <p className="font-semibold">No dishes match.</p>
          <button
            onClick={() => { setQuery(''); setCategoryId('ALL'); setVegOnly(false); }}
            className="btn-ghost mt-3"
          >
            Clear filters
          </button>
        </div>
      )}

      {state === 'ready' && filtered.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const qty = qtyOf(item.id);
            return (
              <article key={item.id} className={`card flex flex-col overflow-hidden transition hover:shadow-lg ${!item.isAvailable ? 'opacity-70' : ''}`}>
                <div className="relative h-40">
                  <FoodImage src={item.imageUrl} alt={item.name} className={`h-full w-full ${!item.isAvailable ? 'grayscale' : ''}`} />
                  {item.isFeatured && item.isAvailable && (
                    <span className="chip absolute left-2.5 top-2.5 bg-brand-500 text-ink-950"><Flame size={11} /> Special</span>
                  )}
                  {!item.isAvailable && (
                    <span className="absolute inset-0 grid place-items-center bg-ink-950/55">
                      <span className="chip bg-chili-500 px-3 py-1.5 text-xs text-white">Sold out</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5"><VegMark isVeg={item.isVeg} /></span>
                    <h3 className="font-display text-base font-bold leading-snug">{item.name}</h3>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs text-ink-500 dark:text-ink-300">{item.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-extrabold">{rupees(item.price)}</p>
                      <p className="flex items-center gap-1 text-[11px] text-ink-400"><Clock size={11} /> ~{item.prepTimeMins} min</p>
                    </div>

                    {!item.isAvailable ? (
                      <span className="text-xs font-semibold text-ink-400">Unavailable</span>
                    ) : qty > 0 ? (
                      <div className="flex items-center gap-1 rounded-xl bg-brand-500 p-1 text-ink-950">
                        <button onClick={() => setQuantity(item.id, qty - 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-brand-400" aria-label={`Remove one ${item.name}`}>
                          <Minus size={15} />
                        </button>
                        <span className="w-6 text-center text-sm font-extrabold">{qty}</span>
                        <button onClick={() => addItem(item, 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-brand-400" aria-label={`Add one more ${item.name}`}>
                          <Plus size={15} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(item, 1)} className="btn-dark !px-4 !py-2">
                        <Plus size={15} /> Add
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
