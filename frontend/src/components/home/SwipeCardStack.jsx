import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  X,
  Plus,
  RotateCcw,
  Clock,
  Flame,
  ShoppingBag,
  Zap,
  Repeat,
  Play,
  Pause,
  ChevronRight,
  Info
} from 'lucide-react';
import FoodImage from '../ui/FoodImage';
import VegMark from '../ui/VegMark';
import { rupees } from '../../utils/format';
import { useCartStore } from '../../store/useCartStore';

const SWIPE_DISTANCE = 100; // px
const SWIPE_VELOCITY = 500; // px/s
const VISIBLE = 3; // top card + 2 peeking behind
const TILTS = [0, -5, 4.5]; // resting rotation per depth
const SPRING = { type: 'spring', stiffness: 300, damping: 26 };

const cardVariants = {
  // `custom` is the swipe direction: 1 = right (add), -1 = left (skip)
  exit: (dir) => ({
    x: dir * 560,
    opacity: 0,
    rotate: dir * 18,
    transition: { duration: 0.3, ease: 'easeOut' },
  }),
};

function StackCard({ item, depth, dir, isTop, stackIndex, onSwipe, onBuyNow, onOpenDetails }) {
  const x = useMotionValue(0);
  const tilt = useMotionValue(TILTS[depth] ?? 0);
  const rotate = useTransform([x, tilt], ([xv, t]) => t + xv / 11);
  const addOpacity = useTransform(x, [15, 90], [0, 1]);
  const skipOpacity = useTransform(x, [-90, -15], [1, 0]);

  useEffect(() => {
    const controls = animate(tilt, TILTS[depth] ?? 0, { type: 'spring', stiffness: 220, damping: 22 });
    return () => controls.stop();
  }, [depth, tilt]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
      onSwipe(1);
    } else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) {
      onSwipe(-1);
    }
  };

  if (!item) return null;

  return (
    <motion.article
      onClick={() => isTop && item.id && onOpenDetails(item.id)}
      className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-xl shadow-ink-900/10 dark:border-ink-700 dark:bg-ink-800"
      style={{
        x: isTop ? x : 0,
        rotate,
        zIndex: VISIBLE - depth,
        touchAction: 'pan-y',
        cursor: isTop ? 'pointer' : 'default',
      }}
      variants={cardVariants}
      custom={dir}
      initial={{ scale: 1 - VISIBLE * 0.05, y: VISIBLE * 16, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: 1 }}
      exit="exit"
      transition={SPRING}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.8}
      whileDrag={{ cursor: 'grabbing' }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      aria-hidden={!isTop}
    >
      <div className="relative h-[56%] shrink-0">
        <FoodImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5 bg-gradient-to-b from-ink-950/60 to-transparent">
          <span className="chip bg-brand-500 font-extrabold text-ink-950 shadow-md">
            <Flame size={12} /> Special
          </span>
          <span className="rounded-full bg-ink-950/80 px-3 py-1 font-display text-sm font-extrabold text-white backdrop-blur shadow-sm">
            {rupees(item.price)}
          </span>
        </div>

        {isTop && (
          <>
            <motion.span
              style={{ opacity: addOpacity }}
              className="pointer-events-none absolute left-4 top-14 -rotate-12 rounded-xl border-4 border-leaf-500 bg-white/90 px-3.5 py-1 font-display text-2xl font-black text-leaf-600 shadow-lg"
            >
              ADD
            </motion.span>
            <motion.span
              style={{ opacity: skipOpacity }}
              className="pointer-events-none absolute right-4 top-14 rotate-12 rounded-xl border-4 border-chili-500 bg-white/90 px-3.5 py-1 font-display text-2xl font-black text-chili-600 shadow-lg"
            >
              SKIP
            </motion.span>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 bg-white dark:bg-ink-800">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VegMark isVeg={item.isVeg} />
              <h3 className="font-display text-xl font-black leading-tight line-clamp-1">{item.name}</h3>
            </div>
            {isTop && (
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-0.5">
                <Info size={11} /> Details
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs sm:text-sm text-ink-500 dark:text-ink-300">
            {item.description}
          </p>
        </div>

        <div className="pt-2 border-t border-ink-100 dark:border-ink-700/60 flex items-center justify-between">
          <div className="text-xs font-semibold text-ink-400 dark:text-ink-300">
            <span className="block truncate max-w-24">{item.category?.name || 'Canteen Special'}</span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock size={11} /> ~{item.prepTimeMins || 10} min
            </span>
          </div>

          {isTop && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onBuyNow(item)}
                className="flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-black text-ink-950 shadow-md transition hover:bg-brand-400 active:scale-95"
                title="Buy now and proceed to payment"
              >
                <Zap size={13} className="fill-ink-950" />
                <span>Buy Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function SwipeCardStack({ items = [], onAdd, onOpenCart }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [addedCount, setAddedCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);

  const buyNow = useCartStore((s) => s.buyNow);
  const total = items.length;

  // Infinite loop swipe handler
  const swipe = (direction) => {
    if (total === 0) return;
    const currentItem = items[index % total];
    setDir(direction);
    if (direction === 1 && currentItem) {
      onAdd(currentItem);
      setAddedCount((n) => n + 1);
    }
    setIndex((i) => i + 1);
  };

  // Buy Now handler: adds item and navigates straight to checkout/payment
  const handleBuyNow = (item) => {
    if (!item) return;
    buyNow(item, 1);
    setAddedCount((n) => n + 1);
    navigate('/checkout');
  };

  const handleOpenDetails = (id) => {
    if (!id) return;
    navigate(`/product/${id}`);
  };

  const handleUndo = () => {
    if (index > 0) {
      setDir(-1);
      setIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (isAutoPlaying && total > 0) {
      autoPlayRef.current = setInterval(() => {
        setDir(1);
        setIndex((i) => i + 1);
      }, 3500);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, total]);

  if (total === 0) {
    return (
      <div className="grid h-[430px] place-items-center rounded-3xl border border-dashed border-ink-200 text-center text-sm text-ink-400 dark:border-ink-700 dark:text-ink-300">
        <p className="max-w-52">Loading canteen dishes…</p>
      </div>
    );
  }

  const visibleCards = [];
  for (let d = 0; d < Math.min(VISIBLE, total); d++) {
    const itemIndex = ((index + d) % total + total) % total;
    const it = items[itemIndex];
    if (it) {
      visibleCards.push({
        item: it,
        depth: d,
        stackKey: `${it.id || itemIndex}_${index + d}`,
      });
    }
  }

  const currentDishNumber = (((index % total) + total) % total) + 1;
  const currentItem = items[((index % total) + total) % total];

  return (
    <div className="mx-auto w-full max-w-[340px]">
      {/* Top status indicator for loop mode */}
      <div className="mb-3 flex items-center justify-between px-1 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 font-bold text-brand-700 dark:text-brand-300">
          <Repeat size={12} className="animate-spin text-brand-600 dark:text-brand-400" style={{ animationDuration: '8s' }} />
          Loop Mode Active
        </span>

        <div className="flex items-center gap-2 text-ink-400 dark:text-ink-300 font-semibold">
          <button
            onClick={() => setIsAutoPlaying((v) => !v)}
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 transition ${
              isAutoPlaying
                ? 'bg-leaf-500/15 text-leaf-600 dark:text-leaf-300 font-bold'
                : 'hover:bg-ink-100 text-ink-500 dark:text-ink-300 dark:hover:bg-ink-800'
            }`}
            title={isAutoPlaying ? 'Pause autoplay loop' : 'Start autoplay loop'}
          >
            {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span className="text-[11px]">{isAutoPlaying ? 'Auto' : 'Play'}</span>
          </button>
          <span>{currentDishNumber}/{total}</span>
        </div>
      </div>

      {/* Infinite Card Stack */}
      <div className="relative mx-auto h-[430px] w-[min(86vw,320px)]">
        <AnimatePresence initial={false} custom={dir}>
          {visibleCards.map(({ item, depth, stackKey }) => (
            <StackCard
              key={stackKey}
              item={item}
              depth={depth}
              dir={dir}
              isTop={depth === 0}
              stackIndex={index + depth}
              onSwipe={swipe}
              onBuyNow={handleBuyNow}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Controls: Undo, Skip, Add to Cart, Buy Now */}
      <div className="mt-7 flex items-center justify-center gap-3">
        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={index === 0}
          className="grid h-12 w-12 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 shadow-sm transition hover:bg-ink-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300"
          aria-label="Previous dish"
          title="Go back"
        >
          <RotateCcw size={18} />
        </button>

        {/* Skip Button */}
        <button
          onClick={() => swipe(-1)}
          className="grid h-13 w-13 place-items-center rounded-full border-2 border-chili-500/40 bg-white text-chili-500 shadow-md transition hover:bg-chili-500 hover:text-white active:scale-95 dark:bg-ink-900"
          aria-label="Skip dish"
          title="Skip"
        >
          <X size={20} strokeWidth={2.6} />
        </button>

        {/* Add to Cart Button */}
        <button
          onClick={() => swipe(1)}
          className="flex h-13 items-center gap-1.5 rounded-full bg-ink-900 px-5 font-bold text-white shadow-md hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 active:scale-95 text-xs sm:text-sm"
          aria-label="Add to cart"
          title="Add to cart & next"
        >
          <Plus size={18} strokeWidth={3} />
          <span>Add</span>
        </button>

        {/* Buy Now Button */}
        <button
          onClick={() => handleBuyNow(currentItem)}
          className="flex h-13 items-center gap-1.5 rounded-full bg-brand-500 px-5 font-black text-ink-950 shadow-lg shadow-brand-500/30 hover:bg-brand-400 active:scale-95 text-xs sm:text-sm"
          aria-label="Buy Now"
          title="Buy now and proceed to checkout"
        >
          <Zap size={18} className="fill-ink-950" />
          <span>Buy Now</span>
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-400 dark:text-ink-300">
        Tap card to view full order details · Swipe right to add
      </p>

      {/* Floating Order Bar when items are added */}
      {addedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <button
            onClick={() => navigate('/checkout')}
            className="flex w-full items-center justify-between rounded-2xl bg-brand-500 px-4 py-3 text-xs font-black text-ink-950 shadow-xl hover:bg-brand-400 transition"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} />
              <span>{addedCount} dish{addedCount > 1 ? 'es' : ''} added</span>
            </span>
            <span className="flex items-center gap-1">
              Proceed to Payment →
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
