import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, Bike, Armchair, ShoppingBag, ShoppingCart, Banknote, Smartphone, CreditCard, QrCode } from 'lucide-react';
import { useCartStore, selectSubtotal, selectCount } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import FoodImage from '../ui/FoodImage';
import UpiScannerModal from '../payment/UpiScannerModal';
import { toast } from '../../store/useToastStore';
import { rupees } from '../../utils/format';
import { api } from '../../services/api';

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
  const user = useAuthStore((st) => st.user);
  const { hostelBlocks, deliveryFee, razorpayKeyId } = useConfigStore();
  const [showScannerModal, setShowScannerModal] = useState(false);

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

  const checkout = async () => {
    if (!user) {
      s.closeCart();
      toast.info('Log in to place your order. Your cart is saved.');
      navigate('/login', { state: { from: '/menu', openCart: true } });
      return;
    }

    // Razorpay pre-payment flow
    if (s.paymentMethod === 'RAZORPAY') {
      await handleRazorpayCheckout();
      return;
    }

    // Standard pay-on-handover flow
    const result = await s.placeOrder();
    if (result.ok) {
      toast.success(`Order #${result.order.orderNumber} placed!`);
      navigate(`/track/${result.order.id}`);
    }
  };

  const handleRazorpayCheckout = async () => {
    if (!razorpayKeyId) {
      toast.error('Online payment is not configured. Please choose Cash or UPI.');
      return;
    }
    // Validate delivery details before calling backend
    if (s.orderType === 'DINE_IN' && !s.tableNumber.trim()) {
      s.setError && s.setError('Enter your table number.');
      return;
    }
    if (s.orderType === 'HOSTEL_DELIVERY' && (!s.hostelBlock || !s.roomNumber.trim())) {
      s.setError && s.setError('Select your hostel block and enter your room number.');
      return;
    }

    useCartStore.setState({ isPlacing: true, error: null });
    let rzpOrderData;
    try {
      const res = await api.post('/payments/create-order', {
        orderType: s.orderType,
        tableNumber: s.orderType === 'DINE_IN' ? s.tableNumber.trim() : undefined,
        hostelBlock: s.orderType === 'HOSTEL_DELIVERY' ? s.hostelBlock : undefined,
        roomNumber: s.orderType === 'HOSTEL_DELIVERY' ? s.roomNumber.trim() : undefined,
        notes: s.notes,
        items: s.cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      rzpOrderData = res.data;
    } catch (err) {
      useCartStore.setState({ isPlacing: false, error: err.message });
      return;
    }
    useCartStore.setState({ isPlacing: false });

    // Open Razorpay checkout
    const options = {
      key: rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: rzpOrderData.currency,
      name: 'CampusBite',
      description: 'Canteen order',
      order_id: rzpOrderData.razorpayOrderId,
      prefill: { name: user.fullName, contact: user.phone },
      theme: { color: '#EF4444' },
      handler: async (response) => {
        useCartStore.setState({ isPlacing: true });
        try {
          const verify = await api.post('/payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderType: s.orderType,
            tableNumber: s.orderType === 'DINE_IN' ? s.tableNumber.trim() : undefined,
            hostelBlock: s.orderType === 'HOSTEL_DELIVERY' ? s.hostelBlock : undefined,
            roomNumber: s.orderType === 'HOSTEL_DELIVERY' ? s.roomNumber.trim() : undefined,
            notes: s.notes,
            items: s.cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          });
          useCartStore.setState({ cart: [], notes: '', isPlacing: false, isOpen: false });
          toast.success(`Order #${verify.data.orderNumber} placed & paid!`);
          navigate(`/track/${verify.data.id}`);
        } catch (err) {
          useCartStore.setState({ isPlacing: false, error: err.message });
          toast.error(err.message);
        }
      },
      modal: {
        ondismiss: () => useCartStore.setState({ isPlacing: false }),
      },
    };

    if (typeof window.Razorpay === 'undefined') {
      toast.error('Razorpay SDK failed to load. Check your connection and try again.');
      return;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
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
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <ShoppingBag size={20} className="text-brand-600" /> Your cart {count > 0 && <span className="text-ink-400">({count})</span>}
          </h2>
          <button onClick={s.closeCart} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close cart">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {s.cart.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-ink-400">
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
                      <button onClick={() => s.removeItem(item.menuItemId)} className="ml-1 p-1 text-ink-400 hover:text-chili-500" aria-label={`Remove ${item.name}`}>
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
                        s.orderType === type ? 'bg-white text-ink-900 shadow dark:bg-ink-600 dark:text-white' : 'text-ink-500'
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

              <section>
                <div className="flex items-center justify-between">
                  <p className="label">Payment</p>
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">Scanner Ready</span>
                </div>
                <div className={`grid gap-2 ${razorpayKeyId ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {[
                    { id: 'UPI', label: 'Online UPI', hint: 'Scan Canteen QR', icon: QrCode },
                    { id: 'CASH', label: 'Cash', hint: 'Pay on handover', icon: Banknote },
                    ...(razorpayKeyId ? [{ id: 'RAZORPAY', label: 'Razorpay', hint: 'Card / UPI now', icon: CreditCard }] : []),
                  ].map(({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => s.setPaymentMethod(id)}
                      aria-pressed={s.paymentMethod === id}
                      className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-left transition ${
                        s.paymentMethod === id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-100 dark:border-ink-700'
                      }`}
                    >
                      <Icon size={18} className="text-brand-700 dark:text-brand-400 shrink-0" />
                      <span>
                        <span className="block text-sm font-bold">{label}</span>
                        <span className="block text-[11px] text-ink-400">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {s.paymentMethod === 'UPI' && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-brand-500/10 p-2.5 text-xs font-semibold text-brand-900 dark:text-brand-200 border border-brand-500/20">
                    <div className="flex items-center gap-2">
                      <img src="/canteen-scanner.jpg" alt="UPI QR" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 border border-brand-500/30" />
                      <div>
                        <p className="font-bold leading-tight">Archana Kumari (7488325002@upi)</p>
                        <p className="text-[10px] text-ink-500 dark:text-ink-400">Scan & pay with GPay/PhonePe</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(true)}
                      className="rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-ink-950 shadow-xs hover:bg-brand-400 transition"
                    >
                      View QR
                    </button>
                  </div>
                )}
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
            <button onClick={checkout} disabled={s.isPlacing} className="btn-primary mt-3 w-full !py-3.5 text-base font-extrabold shadow-md">
              {s.isPlacing ? 'Placing order…' : user ? `Place order · ${rupees(total)}` : 'Log in to order'}
            </button>
            <button
              onClick={() => {
                s.closeCart();
                navigate('/checkout');
              }}
              className="btn-ghost mt-2 w-full !py-2 text-xs font-bold"
            >
              Open Full Payment Page →
            </button>
          </footer>
        )}
      </aside>

      {showScannerModal && (
        <UpiScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          amount={total}
          showUtrInput={false}
        />
      )}
    </div>
  );
}
