export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const dateTimeOf = (iso) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ago` : dateTimeOf(iso);
};

/** Rough ETA: slowest dish + handover buffer (+ travel time for hostel delivery) */
export const estimateReadyAt = (order) => {
  const prep = Math.max(5, ...(order.orderItems || []).map((i) => i.menuItem?.prepTimeMins || 10));
  const extra = order.orderType === 'HOSTEL_DELIVERY' ? 12 : 3;
  return new Date(new Date(order.createdAt).getTime() + (prep + extra) * 60000);
};
