import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Zap,
  Plus,
  Minus,
  Clock,
  Flame,
  ShieldCheck,
  Check,
  Utensils
} from 'lucide-react';
import { api } from '../services/api';
import { useCartStore, selectCount } from '../store/useCartStore';
import { toast } from '../store/useToastStore';
import FoodImage from '../components/ui/FoodImage';
import VegMark from '../components/ui/VegMark';
import { rupees } from '../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [specialNote, setSpecialNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const buyNow = useCartStore((s) => s.buyNow);
  const setNotes = useCartStore((s) => s.setNotes);
  const cartCount = useCartStore(selectCount);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setQuantity(1);

    api.get(`/menu/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        setItem(data);
        setLoading(false);

        // Fetch related items from the same category
        if (data.categoryId) {
          api.get(`/menu?categoryId=${data.categoryId}`)
            .then((res) => {
              if (alive) {
                setRelated((res.data || []).filter((r) => r.id !== data.id).slice(0, 3));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (alive) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { alive = false; };
  }, [id]);

  const handleAddToCart = () => {
    if (!item) return;
    addItem(item, quantity);
    if (specialNote.trim()) {
      const existing = useCartStore.getState().notes;
      const combined = existing ? `${existing}; ${item.name}: ${specialNote}` : `${item.name}: ${specialNote}`;
      setNotes(combined);
    }
    toast.success(`${quantity}× ${item.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!item) return;
    buyNow(item, quantity);
    if (specialNote.trim()) {
      const existing = useCartStore.getState().notes;
      const combined = existing ? `${existing}; ${item.name}: ${specialNote}` : `${item.name}: ${specialNote}`;
      setNotes(combined);
    }
    toast.success(`Proceeding to checkout with ${item.name}!`);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 animate-pulse">
        <div className="h-6 w-32 rounded bg-ink-100 dark:bg-ink-800" />
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="h-80 rounded-3xl bg-ink-100 dark:bg-ink-800" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-5 w-1/4 rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-20 rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-12 rounded bg-ink-100 dark:bg-ink-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card p-8">
          <Utensils className="mx-auto text-ink-300" size={40} />
          <h1 className="mt-3 font-display text-2xl font-bold">Dish Not Found</h1>
          <p className="mt-2 text-sm text-ink-500">This item might no longer be available on today's canteen menu.</p>
          <Link to="/menu" className="btn-primary mt-6">Back to Menu</Link>
        </div>
      </div>
    );
  }

  const isSoldOut = item.isAvailable === false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Menu
        </button>

        <button
          onClick={openCart}
          className="btn-ghost !px-3 !py-1.5 text-xs font-bold"
        >
          <ShoppingBag size={14} /> Cart ({cartCount})
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Left: Product Image & Badges */}
        <div className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-lg dark:border-ink-800 dark:bg-ink-900">
          <div className="relative aspect-square sm:aspect-4/3 w-full">
            <FoodImage
              src={item.imageUrl}
              alt={item.name}
              className={`h-full w-full object-cover ${isSoldOut ? 'grayscale' : ''}`}
            />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 bg-gradient-to-b from-ink-950/60 to-transparent">
              <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink-950 backdrop-blur shadow-sm dark:bg-ink-900/95 dark:text-white">
                <VegMark isVeg={item.isVeg} />
                <span>{item.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
              </span>

              {item.isFeatured && (
                <span className="chip bg-brand-500 font-extrabold text-ink-950 shadow-md">
                  <Flame size={12} /> Bestseller Special
                </span>
              )}
            </div>

            {isSoldOut && (
              <div className="absolute inset-0 grid place-items-center bg-ink-950/60 backdrop-blur-xs">
                <span className="chip bg-chili-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
                  Sold Out Right Now
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Order Details & Actions */}
        <div className="flex flex-col">
          <div className="border-b border-ink-100 pb-5 dark:border-ink-800">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {item.category?.name || 'Canteen Item'}
            </span>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight sm:text-4xl text-ink-900 dark:text-white">
              {item.name}
            </h1>
            <div className="mt-3 flex items-baseline gap-4">
              <span className="font-display text-3xl font-black text-ink-900 dark:text-brand-400">
                {rupees(item.price)}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-ink-400">
                <Clock size={14} /> Estimated prep time ~{item.prepTimeMins || 10} mins
              </span>
            </div>
          </div>

          <div className="py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">Description</h3>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
              {item.description || 'Freshly prepared at the college canteen using authentic local ingredients.'}
            </p>
          </div>

          {!isSoldOut && (
            <>
              {/* Quantity selector */}
              <div className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-800/60 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-700 dark:text-ink-300">
                    Select Quantity
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm hover:bg-ink-100 dark:bg-ink-700 dark:hover:bg-ink-600 font-bold"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-8 text-center font-display text-lg font-black">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm hover:bg-ink-100 dark:bg-ink-700 dark:hover:bg-ink-600 font-bold"
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-200/60 pt-3 dark:border-ink-700/60 text-xs font-bold">
                  <span className="text-ink-500">Subtotal for this dish:</span>
                  <span className="text-base text-brand-600 dark:text-brand-400 font-black">
                    {rupees(item.price * quantity)}
                  </span>
                </div>
              </div>

              {/* Special Note for this dish */}
              <div className="mt-3">
                <label className="label" htmlFor="dish-note">
                  Customization or Instructions (Optional)
                </label>
                <input
                  id="dish-note"
                  type="text"
                  maxLength={150}
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, pack chutney separately…"
                  className="input"
                />
              </div>

              {/* TWO MANDATORY ACTION BUTTONS: Add to Cart and Buy Now */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="btn-dark !py-3.5 text-sm font-extrabold shadow-sm active:scale-95"
                >
                  <ShoppingBag size={18} />
                  <span>Add to Cart</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="btn-primary !py-3.5 text-sm font-black shadow-lg shadow-brand-500/30 active:scale-95"
                >
                  <Zap size={18} className="fill-ink-950" />
                  <span>Buy Now</span>
                </button>
              </div>
            </>
          )}

          {isSoldOut && (
            <div className="mt-6 rounded-2xl bg-ink-50 p-4 text-center text-xs text-ink-500 dark:bg-ink-800">
              This dish is currently sold out in the kitchen. Please check back later or explore other dishes!
            </div>
          )}
        </div>
      </div>

      {/* Related Dishes */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-ink-100 pt-8 dark:border-ink-800">
          <h2 className="font-display text-xl font-black">More from {item.category?.name}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/product/${rel.id}`)}
                className="card group cursor-pointer overflow-hidden p-3 transition hover:border-brand-500 hover:shadow-md"
              >
                <div className="relative h-32 rounded-xl overflow-hidden">
                  <FoodImage src={rel.imageUrl} alt={rel.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute top-2 left-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                    {rupees(rel.price)}
                  </span>
                </div>
                <h4 className="mt-2.5 font-bold text-sm truncate">{rel.name}</h4>
                <div className="mt-3 grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      addItem(rel, 1);
                      toast.success(`${rel.name} added to cart!`);
                    }}
                    className="btn-ghost !py-1.5 !px-2 text-xs font-bold"
                  >
                    + Cart
                  </button>
                  <button
                    onClick={() => {
                      buyNow(rel, 1);
                      navigate('/checkout');
                    }}
                    className="btn-primary !py-1.5 !px-2 text-xs font-bold"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
