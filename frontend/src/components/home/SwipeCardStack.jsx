import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Plus, RotateCcw, Clock, Flame, ShoppingBag } from 'lucide-react';
import FoodImage from '../ui/FoodImage';
import VegMark from '../ui/VegMark';
import { rupees } from '../../utils/format';

const SWIPE_DISTANCE = 110; // px
const SWIPE_VELOCITY = 600; // px/s
const VISIBLE = 3; // top card + 2 peeking behind
const TILTS = [0, -5, 4.5]; // resting rotation per depth
const SPRING = { type: 'spring', stiffness: 300, damping: 26 };

const cardVariants = {
  // `custom` is the swipe direction: 1 = right (add), -1 = left (skip)
  exit: (dir) => ({
    x: dir * 560,
    opacity: 0,
    transition: { duration: 0.32, ease: 'easeOut' },
  }),
};

function StackCard({ item, depth, dir, onSwipe }) {
  const isTop = depth === 0;
  const x = useMotionValue(0);
  const tilt = useMotionValue(TILTS[depth] ?? 0);
  // card leans with the finger, on top of its resting tilt
  const rotate = useTransform([x, tilt], ([xv, t]) => t + xv / 11);
  const addOpacity = useTransform(x, [15, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, -15], [1, 0]);

  useEffect(() => {
    const controls = animate(tilt, TILTS[depth] ?? 0, { type: 'spring', stiffness: 220, damping: 22 });
    return () => controls.stop();
  }, [depth, tilt]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe(1);
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe(-1);
  };

  return (
    <motion.article
      className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-[28px] border border-ink-100 bg-white shadow-xl shadow-ink-900/10 dark:border-ink-700 dark:bg-ink-800"
      style={{ x, rotate, zIndex: VISIBLE - depth, touchAction: 'pan-y', cursor: isTop ? 'grab' : 'default' }}
      variants={cardVariants}
      custom={dir}
      initial={{ scale: 1 - VISIBLE * 0.05, y: VISIBLE * 16, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: 1 }}
      exit="exit"
      transition={SPRING}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.85}
      whileDrag={{ cursor: 'grabbing' }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      aria-hidden={!isTop}
    >
      <div className="relative h-[58%] shrink-0">
        <FoodImage src={item.imageUrl} alt={item.name} className="h-full w-full" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="chip bg-brand-500 text-ink-950 shadow">
            <Flame size={12} /> Bestseller
          </span>
          <span className="rounded-full bg-ink-950/75 px-3 py-1 text-sm font-bold text-white backdrop-blur">
            {rupees(item.price)}
          </span>
        </div>

        {isTop && (
          <>
            <motion.span
              style={{ opacity: addOpacity }}
              className="absolute left-4 top-14 -rotate-12 rounded-lg border-4 border-leaf-500 bg-white/80 px-3 py-1 font-display text-2xl font-extrabold text-leaf-600"
            >
              ADD
            </motion.span>
            <motion.span
              style={{ opacity: skipOpacity }}
              className="absolute right-4 top-14 rotate-12 rounded-lg border-4 border-chili-500 bg-white/80 px-3 py-1 font-display text-2xl font-extrabold text-chili-600"
            >
              SKIP
            </motion.span>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-2">
            <VegMark isVeg={item.isVeg} />
            <h3 className="font-display text-xl font-bold leading-tight">{item.name}</h3>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-500 dark:text-ink-300">{item.description}</p>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold text-ink-400">
          <span>{item.category?.name}</span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> ~{item.prepTimeMins} min
          </span>
        </div>
      </div>
    </motion.article>
  );
}

export default function SwipeCardStack({ items, onAdd, onOpenCart }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [addedCount, setAddedCount] = useState(0);

  // restart if the list itself changes (e.g. admin un-features a dish)
  useEffect(() => { setIndex(0); setAddedCount(0); }, [items.length]);

  const visible = items.slice(index, index + VISIBLE);
  const finished = items.length > 0 && index >= items.length;

  const swipe = (direction) => {
    const item = items[index];
    if (!item) return;
    setDir(direction);
    if (direction === 1) {
      onAdd(item);
      setAddedCount((n) => n + 1);
    }
    setIndex((i) => i + 1);
  };

  const replay = () => { setIndex(0); setAddedCount(0); };

  if (items.length === 0) {
    return (
      <div className="grid h-[430px] place-items-center rounded-3xl border border-dashed border-ink-200 text-center text-sm text-ink-400 dark:border-ink-700">
        <p className="max-w-52">Today’s specials will appear here once the canteen marks dishes as featured.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="relative mx-auto h-[430px] w-[min(86vw,320px)]">
        <AnimatePresence initial={false} custom={dir}>
          {visible.map((item, depth) => (
            <StackCard key={item.id} item={item} depth={depth} dir={dir} onSwipe={swipe} />
          ))}
        </AnimatePresence>

        {finished && (
          <div className="absolute inset-0 grid place-items-center rounded-[28px] border border-dashed border-ink-200 p-6 text-center dark:border-ink-700">
            <div>
              <p className="font-display text-xl font-bold">That’s every special</p>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                {addedCount > 0 ? `${addedCount} added to your cart.` : 'Nothing added yet.'}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {addedCount > 0 && (
                  <button onClick={onOpenCart} className="btn-primary"><ShoppingBag size={16} /> View cart</button>
                )}
                <button onClick={replay} className="btn-ghost"><RotateCcw size={16} /> Swipe again</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!finished && (
        <>
          <div className="mt-9 flex items-center justify-center gap-5">
            <button
              onClick={() => swipe(-1)}
              className="grid h-14 w-14 place-items-center rounded-full border-2 border-chili-500/40 bg-white text-chili-500 shadow-md transition hover:bg-chili-500 hover:text-white active:scale-95 dark:bg-ink-900"
              aria-label="Skip this dish"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => swipe(1)}
              className="flex h-16 items-center gap-2 rounded-full bg-brand-500 px-7 font-bold text-ink-950 shadow-lg shadow-brand-500/30 transition hover:bg-brand-400 active:scale-95"
              aria-label="Add this dish to cart"
            >
              <Plus size={20} strokeWidth={3} /> Add to cart
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-ink-400">
            Swipe right to add · swipe left to skip · {Math.min(index + 1, items.length)} of {items.length}
          </p>
        </>
      )}
    </div>
  );
}
