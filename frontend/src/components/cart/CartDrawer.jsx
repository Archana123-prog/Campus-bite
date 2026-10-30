import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, Bike, Armchair, ShoppingBag, ShoppingCart, CreditCard } from 'lucide-react';
import { useCartStore, selectSubtotal, selectCount } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import FoodImage from '../ui/FoodImage';
import { rupees } from '../../utils/format';

const MODES = [
  { type: 'HOSTEL_DELIVERY', label: 'Hostel', icon: Bike },
  { type: 'DINE_IN', label: 'Table', icon: Armchair },
  { type: 'TAKEAWAY', label: 'Pickup', icon: ShoppingBag },
];

export default function CartDrawer() {
  const navigate = useNavigate();
  const s = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectCount);
  const user = useAuthStore((state) => state.user);
  const { hostelBlocks, deliveryFee } = useConfigStore();

  const fee = s.orderType === 'HOSTEL_DELIVERY' ? deliveryFee : 0;
  const total = subtotal + fee;

  // Prefill the hostel address from the student's profile (only if still empty)
  useEffect(() => {
    if (s.isOpen && user?.hostelBlock && !s.hostelBlock) s.setHostel(user.hostelBlock, user.roomNumber || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.isOpen, user]);

  useEffect(() => {
    if (!s.isOpen) return;
    const onKey = (e) => e.key === 'Escape' && s.closeCart();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.isOpen]);

  if (!s.isOpen) return null;

  const checkout = () => {
    s.closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink-950/60 backdrop-blur-sm" onMouseDown={s.closeCart}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md animate-slideIn flex-col bg-white shadow-2xl dark:bg-ink-900"
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <ShoppingBag size={20} className="text-brand-600" /> Your cart {count > 0 && <span className="text-ink-400 dark:text-ink-300">({count})</span>}
          </h2>
          <button onClick={s.closeCart} className="rounded-lg p-1.5 text-ink-400 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close cart">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {s.cart.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-ink-400 dark:text-ink-300">
              <ShoppingCart size={36} />
              <p className="text-sm">Your cart is empty.</p>
              <button onClick={() => { s.closeCart(); navigate('/menu'); }} className="btn-primary">Browse the menu</button>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {s.cart.map((item) => (
                  <li key={item.menuItemId} className="flex items-center gap-3 rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800">
                    <FoodImage src={item.imageUrl} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.name}</p>
                      <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">{rupees(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => s.setQuantity(item.menuItemId, item.quantity - 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-sm dark:bg-ink-700" aria-label={`Decrease ${item.name}`}>
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => s.setQuantity(item.menuItemId, item.quantity + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-sm dark:bg-ink-700" aria-label={`Increase ${item.name}`}>
                        <Plus size={13} />
                      </button>
                      <button onClick={() => s.removeItem(item.menuItemId)} className="ml-1 p-1 text-ink-400 dark:text-ink-300 hover:text-chili-500" aria-label={`Remove ${item.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <section>
                <p className="label">How should we serve it?</p>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
                  {MODES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => s.setOrderType(type)}
                      aria-pressed={s.orderType === type}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                        s.orderType === type ? 'bg-white text-ink-900 shadow dark:bg-ink-600 dark:text-white' : 'text-ink-500 dark:text-ink-300'
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>

                {s.orderType === 'HOSTEL_DELIVERY' && (
                  <div className="mt-3 grid grid-cols-[1fr_6.5rem] gap-2">
                    <div>
                      <label className="label" htmlFor="hostel-block">Hostel block</label>
                      <select id="hostel-block" className="input" value={s.hostelBlock} onChange={(e) => s.setHostel(e.target.value, s.roomNumber)}>
                        <option value="">Select…</option>
                        {hostelBlocks.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="room-no">Room no.</label>
                      <input id="room-no" className="input" placeholder="302" maxLength={10} value={s.roomNumber} onChange={(e) => s.setHostel(s.hostelBlock, e.target.value)} />
                    </div>
                  </div>
                )}

                {s.orderType === 'DINE_IN' && (
                  <div className="mt-3">
                    <label className="label" htmlFor="table-no">Table number</label>
                    <input id="table-no" className="input" placeholder="e.g. 7 (or scan the QR on your table)" maxLength={10} value={s.tableNumber} onChange={(e) => s.setTableNumber(e.target.value)} />
                  </div>
                )}
                {s.orderType === 'TAKEAWAY' && (
                  <p className="mt-3 rounded-xl bg-ink-50 p-3 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                    We’ll mark it ready and you collect it from the counter. Show your order number.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <CreditCard size={17} className="text-brand-600" />
                  UPI Payment & Verification
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                  Pay securely via UPI (hayaarav@fam) or QR scan. Your order is placed and confirmed upon verification.
                </p>
              </section>

              <section>
                <label className="label" htmlFor="notes">Note for the kitchen (optional)</label>
                <textarea id="notes" rows={2} maxLength={300} className="input resize-none" placeholder="Less spicy, no onion…" value={s.notes} onChange={(e) => s.setNotes(e.target.value)} />
              </section>
            </>
          )}
        </div>

        {s.cart.length > 0 && (
          <footer className="border-t border-ink-100 px-5 py-4 dark:border-ink-800">
            {s.error && <p role="alert" className="mb-3 rounded-lg bg-chili-500/10 px-3 py-2 text-xs font-semibold text-chili-600 dark:text-red-300">{s.error}</p>}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-500 dark:text-ink-300"><dt>Items</dt><dd>{rupees(subtotal)}</dd></div>
              {fee > 0 && <div className="flex justify-between text-ink-500 dark:text-ink-300"><dt>Delivery</dt><dd>{rupees(fee)}</dd></div>}
              <div className="flex justify-between pt-1 text-lg font-extrabold"><dt>Total</dt><dd>{rupees(total)}</dd></div>
            </dl>
            <button onClick={checkout} className="btn-primary mt-3 w-full !py-3.5 text-base font-extrabold shadow-md">
              Continue to payment · {rupees(total)}
            </button>
          </footer>
        )}
      </aside>

    </div>
  );
}
