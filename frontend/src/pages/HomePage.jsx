import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bike,
  Armchair,
  ShoppingBag,
  ArrowRight,
  Zap,
  Sparkles,
  Repeat,
  Flame,
  UtensilsCrossed
} from 'lucide-react';
import SwipeCardStack from '../components/home/SwipeCardStack';
import { useCartStore, selectCount, selectSubtotal } from '../store/useCartStore';
import { useConfigStore } from '../store/useConfigStore';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from '../store/useToastStore';
import { rupees } from '../utils/format';

const MODES = [
  {
    type: 'HOSTEL_DELIVERY',
    icon: Bike,
    title: 'To my hostel',
    text: 'Pick your block and room. A runner brings it hot to your door.',
  },
  {
    type: 'DINE_IN',
    icon: Armchair,
    title: 'To my table',
    text: 'Sitting in the canteen? Order from your seat, we bring it over.',
  },
  {
    type: 'TAKEAWAY',
    icon: ShoppingBag,
    title: 'I’ll pick it up',
    text: 'Order between classes and collect it hot at the counter.',
  },
];

// High quality fallback canteen specials ensuring swiper is ALWAYS available
const FALLBACK_SPECIALS = [
  {
    id: 'spec-1',
    name: 'Crispy Samosa (2 pcs)',
    description: 'Golden spiced potato and pea filling served with mint & tamarind chutney.',
    price: 30,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    prepTimeMins: 5,
    category: { name: 'Snacks & Chaat' },
  },
  {
    id: 'spec-2',
    name: 'Paneer Butter Masala + Naan',
    description: 'Cottage cheese cubes cooked in rich creamy butter gravy with crisp garlic naan.',
    price: 160,
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    prepTimeMins: 15,
    category: { name: 'Meals & Thali' },
  },
  {
    id: 'spec-3',
    name: 'Cold Coffee with Ice Cream',
    description: 'Thick blended artisanal espresso topped with vanilla ice cream and rich chocolate fudge.',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    prepTimeMins: 5,
    category: { name: 'Drinks & Shakes' },
  },
  {
    id: 'spec-4',
    name: 'Masala Dosa',
    description: 'Crisp golden crepe folded with spiced potato masala, served with piping hot sambar.',
    price: 90,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    prepTimeMins: 10,
    category: { name: 'South Indian' },
  },
  {
    id: 'spec-5',
    name: 'Veg Cheese Grill Sandwich',
    description: 'Toasted double-decker with crisp veggies, spiced mint chutney, and molten cheese.',
    price: 80,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    prepTimeMins: 8,
    category: { name: 'Snacks & Chaat' },
  },
];

let cachedDishes = null;

export default function HomePage() {
  const navigate = useNavigate();
  // Initialize immediately with cached dishes or fallbacks so there is 0ms delay on refresh
  const [items, setItems] = useState(() => cachedDishes || FALLBACK_SPECIALS);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const cartCount = useCartStore(selectCount);
  const cartSubtotal = useCartStore(selectSubtotal);
  const deliveryFee = useConfigStore((s) => s.deliveryFee);

  useEffect(() => {
    let alive = true;

    const loadDishes = async () => {
      try {
        // Fetch featured specials
        const featuredRes = await api.get('/menu/featured');
        const featuredData = featuredRes.data || [];

        if (featuredData.length >= 3) {
          cachedDishes = featuredData;
          if (alive) setItems(featuredData);
          return;
        }

        // If featured list is small or empty, supplement with general active menu items
        const menuRes = await api.get('/menu');
        const menuData = (menuRes.data || []).filter((i) => i.isAvailable !== false);

        if (menuData.length > 0) {
          const combined = [...featuredData];
          for (const item of menuData) {
            if (!combined.some((c) => c.id === item.id)) {
              combined.push(item);
            }
          }
          cachedDishes = combined;
          if (alive) setItems(combined);
          return;
        }

        const fallback = featuredData.length > 0 ? featuredData : FALLBACK_SPECIALS;
        cachedDishes = fallback;
        if (alive) setItems(fallback);
      } catch (err) {
        // Fallback so card swiper is ALWAYS interactive and never stuck
        if (alive && (!cachedDishes || cachedDishes.length === 0)) {
          setItems(FALLBACK_SPECIALS);
        }
      }
    };

    loadDishes();

    // keep specials in sync when the kitchen updates a dish
    const socket = getSocket();
    socket.on('menu_updated', loadDishes);
    return () => {
      alive = false;
      socket.off('menu_updated', loadDishes);
    };
  }, []);

  const handleAdd = (item) => {
    addItem(item, 1);
    toast.success(`${item.name} added to cart!`);
  };

  const chooseMode = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
      {/* Top Hero Section with Card Swiper in Continuous Loop */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-extrabold text-brand-700 dark:text-brand-300 shadow-xs">
            <Zap size={14} className="text-brand-600 fill-brand-600 dark:text-brand-400" />
            <span>Skip the Canteen Queue</span>
            <span className="h-1 w-1 rounded-full bg-brand-500" />
            <span className="flex items-center gap-1 text-[11px] text-ink-500 dark:text-ink-300 font-semibold">
              <Repeat size={11} /> Continuous Loop Active
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Hot food from the canteen, swiped & ordered in seconds.
          </h1>

          <p className="mt-4 max-w-md text-base text-ink-600 dark:text-ink-300">
            Swipe right on delicious specials or browse the full menu. Order to your hostel block, table, or counter pickup. Hostel delivery is just {rupees(deliveryFee)}.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/menu" className="btn-primary !px-6 !py-3.5 text-base shadow-md shadow-brand-500/20">
              <UtensilsCrossed size={18} /> Browse Full Menu
            </Link>

            <button
              onClick={openCart}
              className="btn-ghost !px-6 !py-3.5 text-base border border-ink-200 dark:border-ink-700"
            >
              <ShoppingBag size={18} />
              <span>{cartCount > 0 ? `View Cart (${cartCount} • ${rupees(cartSubtotal)})` : 'Open Cart'}</span>
            </button>
          </div>

          {/* Quick order prompt if cart has items */}
          {cartCount > 0 && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-brand-500/15 p-3 pr-4 text-xs font-bold text-brand-800 dark:text-brand-200 border border-brand-500/30">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-ink-950 font-black">
                {cartCount}
              </span>
              <span>You have items in your cart ready to checkout!</span>
              <button
                onClick={openCart}
                className="ml-auto underline hover:text-brand-900 dark:hover:text-white"
              >
                Checkout now →
              </button>
            </div>
          )}
        </div>

        {/* The Card Swiper: Always Available in Loop */}
        <div className="pt-2">
          <SwipeCardStack items={items && items.length > 0 ? items : FALLBACK_SPECIALS} onAdd={handleAdd} onOpenCart={openCart} />
        </div>
      </section>

      {/* Serving Mode Options */}
      <section className="mt-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-black sm:text-3xl">How do you want it delivered?</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
              Choose your order style and start picking your meals.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {MODES.map(({ type, icon: Icon, title, text }) => (
            <button
              key={type}
              onClick={() => chooseMode(type)}
              className="card group p-5 text-left transition hover:border-brand-500 hover:shadow-xl dark:hover:border-brand-500 relative overflow-hidden"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-900 text-brand-400 transition group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-ink-950 dark:bg-brand-500/15 dark:text-brand-400">
                <Icon size={24} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-300 leading-relaxed">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 transition group-hover:gap-2.5 dark:text-brand-400">
                Order this way <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
