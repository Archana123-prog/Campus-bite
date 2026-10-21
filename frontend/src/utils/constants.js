export const ORDER_TYPES = {
  HOSTEL_DELIVERY: { label: 'Hostel delivery', short: 'Delivery' },
  DINE_IN: { label: 'Dine-in at table', short: 'Dine-in' },
  TAKEAWAY: { label: 'Takeaway / pickup', short: 'Pickup' },
};

export const STATUS = {
  PENDING: { label: 'Order received', tone: 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300' },
  PREPARING: { label: 'In the kitchen', tone: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300' },
  READY: { label: 'Ready', tone: 'bg-leaf-500/15 text-leaf-600 dark:text-emerald-300' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300' },
  SERVED: { label: 'Completed', tone: 'bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-chili-500/15 text-chili-600 dark:text-red-300' },
};

/** Step timeline shown to customers, per order type */
export const TIMELINE = {
  HOSTEL_DELIVERY: ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'SERVED'],
  DINE_IN: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
  TAKEAWAY: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
};

export const STEP_LABEL = {
  HOSTEL_DELIVERY: {
    PENDING: 'Order received',
    PREPARING: 'Cooking',
    READY: 'Packed, waiting for a runner',
    OUT_FOR_DELIVERY: 'On the way to your hostel',
    SERVED: 'Delivered',
  },
  DINE_IN: {
    PENDING: 'Order received',
    PREPARING: 'Cooking',
    READY: 'Ready, coming to your table',
    SERVED: 'Served',
  },
  TAKEAWAY: {
    PENDING: 'Order received',
    PREPARING: 'Cooking',
    READY: 'Ready for pickup at the counter',
    SERVED: 'Picked up',
  },
};

export const FALLBACK_EMOJI = '🍛';
