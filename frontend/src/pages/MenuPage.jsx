import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Minus, Clock, Flame, AlertCircle, Leaf, Zap, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useCartStore } from '../store/useCartStore';
import { toast } from '../store/useToastStore';
import FoodImage from '../components/ui/FoodImage';
import VegMark from '../components/ui/VegMark';
import { rupees } from '../utils/format';

let cachedCategories = null;
let cachedMenuItems = null;

export default function MenuPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(() => cachedCategories || []);
  const [items, setItems] = useState(() => cachedMenuItems || []);
  const [categoryId, setCategoryId] = useState('ALL');
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [state, setState] = useState(() => (cachedMenuItems && cachedMenuItems.length > 0 ? 'ready' : 'loading'));

  const cart = useCartStore((s) => s.cart);
  const addItem = useCartStore((s) => s.addItem);
  const buyNow = useCartStore((s) => s.buyNow);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const load = () => {
    if (!cachedMenuItems) setState('loading');
    Promise.all([api.get('/menu/categories'), api.get('/menu')])
      .then(([c, m]) => {
        const cats = (c.data || []).filter((cat) => cat._count?.menuItems > 0);
        const its = m.data || [];
        cachedCategories = cats;
        cachedMenuItems = its;
        setCategories(cats);
        setItems(its);
        setState('ready');
      })
      .catch(() => {
        if (!cachedMenuItems) setState('error');
      });
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

  const handleCardClick = (itemId) => {
    navigate(`/product/${itemId}`);
  };

  const handleAddToCart = (e, item) => {
    e.stopPropagation();
    addItem(item, 1);
    toast.success(`${item.name} added to cart!`);
  };

  const handleBuyNow = (e, item) => {
    e.stopPropagation();
    buyNow(item, 1);
    toast.success(`Proceeding to checkout with ${item.name}!`);
    navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Canteen menu</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
            Click any dish to see order details, customizations, and ingredients.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-300" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dosa, chai, thali…"
              className="input pl-9 pr-9"
              aria-label="Search menu"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-300" aria-label="Clear search">
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
          <p className="text-sm text-ink-500 dark:text-ink-300">Check that the backend is running, then try again.</p>
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
              <article
                key={item.id}
                onClick={() => handleCardClick(item.id)}
                className={`card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-brand-500 hover:shadow-xl cursor-pointer ${
                  !item.isAvailable ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {/* Product Image */}
                <div className="relative h-44 overflow-hidden">
                  <FoodImage
                    src={item.imageUrl}
                    alt={item.name}
                    className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                      !item.isAvailable ? 'grayscale' : ''
                    }`}
                  />
                  {item.isFeatured && item.isAvailable && (
                    <span className="chip absolute left-2.5 top-2.5 bg-brand-500 text-ink-950 font-bold shadow-md">
                      <Flame size={11} /> Special
                    </span>
                  )}
                  {!item.isAvailable && (
                    <span className="absolute inset-0 grid place-items-center bg-ink-950/60 backdrop-blur-xs">
                      <span className="chip bg-chili-500 px-3 py-1.5 text-xs text-white font-extrabold">
                        Sold out
                      </span>
                    </span>
                  )}
                  <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-xs font-black text-white backdrop-blur">
                    {rupees(item.price)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4 justify-between">
                  <div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5"><VegMark isVeg={item.isVeg} /></span>
                      <h3 className="font-display text-base font-black leading-snug line-clamp-1 group-hover:text-brand-600 transition">
                        {item.name}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs text-ink-500 dark:text-ink-300 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400 dark:text-ink-300 font-semibold">
                      <span>{item.category?.name}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> ~{item.prepTimeMins || 10} min
                      </span>
                    </div>
                  </div>

                  {/* MANDATORY ACTION BUTTONS: Add to Cart and Buy Now */}
                  <div className="mt-4 pt-3 border-t border-ink-100 dark:border-ink-800">
                    {!item.isAvailable ? (
                      <span className="block text-center text-xs font-bold text-ink-400 dark:text-ink-300 py-1.5">
                        Sold Out
                      </span>
                    ) : (
                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Add to Cart button / quantity stepper */}
                        {qty > 0 ? (
                          <div className="flex items-center justify-between rounded-xl bg-brand-500 p-1 text-ink-950">
                            <button
                              onClick={() => setQuantity(item.id, qty - 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg hover:bg-brand-400 font-bold"
                              aria-label={`Remove one ${item.name}`}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="font-black text-xs">{qty}</span>
                            <button
                              onClick={() => addItem(item, 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg hover:bg-brand-400 font-bold"
                              aria-label={`Add one more ${item.name}`}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleAddToCart(e, item)}
                            className="btn-dark !py-2 !px-2 text-xs font-bold w-full"
                            title="Add to cart"
                          >
                            <ShoppingBag size={13} /> Add
                          </button>
                        )}

                        {/* Buy Now button */}
                        <button
                          onClick={(e) => handleBuyNow(e, item)}
                          className="btn-primary !py-2 !px-2 text-xs font-black w-full shadow-sm"
                          title="Instant buy and checkout"
                        >
                          <Zap size={13} className="fill-ink-950" /> Buy Now
                        </button>
                      </div>
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
