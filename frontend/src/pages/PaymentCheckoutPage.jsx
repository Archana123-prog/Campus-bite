import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bike,
  Armchair,
  ShoppingBag,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import { useCartStore, selectSubtotal, selectCount, deliveryFeeFor } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import FoodImage from '../components/ui/FoodImage';
import UpiPaymentCard from '../components/payment/UpiPaymentCard';
import { toast } from '../store/useToastStore';
import { rupees } from '../utils/format';
import { api } from '../services/api';

const MODES = [
  { type: 'HOSTEL_DELIVERY', label: 'Hostel Delivery', hint: 'Delivered to room', icon: Bike },
  { type: 'DINE_IN', label: 'Dine In / Table', hint: 'Served at canteen table', icon: Armchair },
  { type: 'TAKEAWAY', label: 'Takeaway / Pickup', hint: 'Collect at counter', icon: ShoppingBag },
];

export default function PaymentCheckoutPage() {
  const navigate = useNavigate();
  const cart = useCartStore((s) => s.cart);
  const orderType = useCartStore((s) => s.orderType);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const hostelBlock = useCartStore((s) => s.hostelBlock);
  const roomNumber = useCartStore((s) => s.roomNumber);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const notes = useCartStore((s) => s.notes);
  const isPlacing = useCartStore((s) => s.isPlacing);
  const error = useCartStore((s) => s.error);
  const [utrNumber, setUtrNumber] = useState('');

  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const setHostel = useCartStore((s) => s.setHostel);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const setNotes = useCartStore((s) => s.setNotes);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const placeOrder = useCartStore((s) => s.placeOrder);

  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectCount);
  const user = useAuthStore((s) => s.user);
  const { hostelBlocks, deliveryFee, razorpayKeyId } = useConfigStore();

  const fee = orderType === 'HOSTEL_DELIVERY' ? deliveryFee : 0;
  const grandTotal = subtotal + fee;

  // Prefill default hostel details from user's profile if empty
  useEffect(() => {
    if (user?.hostelBlock && !hostelBlock) {
      setHostel(user.hostelBlock, user.roomNumber || '');
    }
  }, [user, hostelBlock, setHostel]);

  const handleCheckout = async () => {
    if (!user) {
      toast.info('Please log in to place your order. Your items are saved.');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      toast.error('Please enter your table number.');
      return;
    }

    if (orderType === 'HOSTEL_DELIVERY' && (!hostelBlock || !roomNumber.trim())) {
      toast.error('Please select your hostel block and enter your room number.');
      return;
    }

    // Razorpay flow if online payment chosen
    if (paymentMethod === 'RAZORPAY') {
      await handleRazorpayPayment();
      return;
    }

    // Standard cash/UPI flow - append UTR reference if student entered one
    if (paymentMethod === 'UPI' && utrNumber.trim()) {
      const currentNotes = useCartStore.getState().notes || '';
      const updatedNotes = currentNotes.trim()
        ? `${currentNotes.trim()} [UPI UTR: ${utrNumber.trim()}]`
        : `UPI UTR: ${utrNumber.trim()}`;
      useCartStore.setState({ notes: updatedNotes });
    }

    const result = await placeOrder();
    if (result.ok) {
      toast.success(`Order #${result.order.orderNumber} placed successfully!`);
      navigate(`/track/${result.order.id}`);
    } else {
      toast.error(result.error || 'Failed to place order.');
    }
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayKeyId) {
      toast.error('Online payment is not configured. Please choose Cash or UPI.');
      return;
    }

    useCartStore.setState({ isPlacing: true, error: null });
    let rzpOrderData;
    try {
      const res = await api.post('/payments/create-order', {
        orderType,
        tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() : undefined,
        hostelBlock: orderType === 'HOSTEL_DELIVERY' ? hostelBlock : undefined,
        roomNumber: orderType === 'HOSTEL_DELIVERY' ? roomNumber.trim() : undefined,
        notes,
        items: cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      rzpOrderData = res.data;
    } catch (err) {
      useCartStore.setState({ isPlacing: false, error: err.message });
      toast.error(err.message || 'Payment initiation failed.');
      return;
    }
    useCartStore.setState({ isPlacing: false });

    const options = {
      key: rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: rzpOrderData.currency,
      name: 'CampusBite',
      description: 'Canteen Order Payment',
      order_id: rzpOrderData.razorpayOrderId,
      prefill: { name: user?.fullName || '', contact: user?.phone || '' },
      theme: { color: '#EF4444' },
      handler: async (response) => {
        useCartStore.setState({ isPlacing: true });
        try {
          const verify = await api.post('/payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderType,
            tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() : undefined,
            hostelBlock: orderType === 'HOSTEL_DELIVERY' ? hostelBlock : undefined,
            roomNumber: orderType === 'HOSTEL_DELIVERY' ? roomNumber.trim() : undefined,
            notes,
            items: cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          });
          useCartStore.setState({ cart: [], notes: '', isPlacing: false, isOpen: false });
          toast.success(`Order #${verify.data.orderNumber} placed & paid successfully!`);
          navigate(`/track/${verify.data.id}`);
        } catch (err) {
          useCartStore.setState({ isPlacing: false, error: err.message });
          toast.error(err.message || 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: () => useCartStore.setState({ isPlacing: false }),
      },
    };

    if (typeof window.Razorpay === 'undefined') {
      toast.error('Razorpay SDK failed to load. Check your internet connection.');
      return;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
            <ShoppingBag size={32} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-black">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            Add hot canteen specials to your cart or choose a dish from the menu to proceed with checkout.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/menu" className="btn-primary !px-6 !py-3">
              Browse Menu & Specials
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top back button & title */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300">
          <ShieldCheck size={14} /> Secure Payment & Order
        </span>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
          Order Checkout & Payment
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Review your items, delivery details, and pick your preferred payment method.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        {/* Left column: Delivery options & Order items */}
        <div className="space-y-6">
          {/* Order Items List */}
          <section className="card p-5">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <ShoppingBag size={18} className="text-brand-600" />
                Ordered Dishes ({count})
              </h2>
              <Link to="/menu" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400">
                + Add more
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
              {cart.map((item) => (
                <li key={item.menuItemId} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                  <FoodImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-ink-400">
                      {rupees(item.price)} each
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-brand-600 dark:text-brand-400">
                      {rupees(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQuantity(item.menuItemId, item.quantity - 1)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.menuItemId, item.quantity + 1)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700"
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => removeItem(item.menuItemId)}
                      className="ml-2 p-1 text-ink-400 hover:text-chili-500"
                      aria-label="Remove item"
                      title="Remove dish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Delivery Details */}
          <section className="card p-5">
            <h2 className="font-display text-base font-bold mb-3">Delivery Preference</h2>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(({ type, label, hint, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition ${
                    orderType === type
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 text-ink-950 dark:text-white'
                      : 'border-ink-100 dark:border-ink-800 text-ink-500 hover:border-ink-200'
                  }`}
                >
                  <Icon size={20} className={orderType === type ? 'text-brand-600' : 'text-ink-400'} />
                  <span className="mt-1 text-xs font-bold">{label}</span>
                  <span className="text-[10px] text-ink-400 line-clamp-1">{hint}</span>
                </button>
              ))}
            </div>

            {orderType === 'HOSTEL_DELIVERY' && (
              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/70 p-4 dark:border-ink-800 dark:bg-ink-900/50">
                <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-2.5">
                  Hostel Room Delivery Address
                </p>
                <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                  <div>
                    <label className="label" htmlFor="checkout-hostelBlock">Hostel Block</label>
                    <select
                      id="checkout-hostelBlock"
                      className="input"
                      value={hostelBlock}
                      onChange={(e) => setHostel(e.target.value, roomNumber)}
                    >
                      <option value="">Select hostel block…</option>
                      {hostelBlocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="checkout-roomNumber">Room Number</label>
                    <input
                      id="checkout-roomNumber"
                      className="input"
                      placeholder="e.g. 302"
                      maxLength={10}
                      value={roomNumber}
                      onChange={(e) => setHostel(hostelBlock, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {orderType === 'DINE_IN' && (
              <div className="mt-4">
                <label className="label" htmlFor="checkout-tableNumber">Table Number</label>
                <input
                  id="checkout-tableNumber"
                  className="input"
                  placeholder="e.g. Table 8"
                  maxLength={10}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            )}

            {orderType === 'TAKEAWAY' && (
              <div className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-300">
                Collect your hot food fresh at the canteen counter. Show your order number when ready.
              </div>
            )}

            <div className="mt-4">
              <label className="label" htmlFor="checkout-notes">Kitchen Note (Optional)</label>
              <textarea
                id="checkout-notes"
                rows={2}
                maxLength={300}
                className="input resize-none"
                placeholder="e.g. Extra spicy, less oil, no onions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* Right column: Payment method & Grand Total */}
        <div className="space-y-6">
          {/* Payment Method Selector */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold">Choose Payment Method</h2>
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                Online UPI Scanner Active
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  id: 'UPI',
                  label: 'Online Payment (UPI Scanner)',
                  hint: 'Scan QR with GPay / PhonePe / Paytm / BHIM',
                  icon: QrCode,
                  badge: 'Recommended',
                },
                ...(razorpayKeyId
                  ? [{ id: 'RAZORPAY', label: 'Cards / Netbanking (Razorpay)', hint: 'Credit/Debit Cards, Netbanking', icon: CreditCard }]
                  : []),
              ].map(({ id, label, hint, icon: Icon, badge }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                    paymentMethod === id
                      ? 'border-brand-500 bg-brand-50/60'
                      : 'border-ink-100 hover:border-ink-200'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    paymentMethod === id ? 'bg-brand-500 text-ink-950 font-bold' : 'bg-ink-100 text-ink-600'
                  }`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold leading-tight">{label}</p>
                      {badge && (
                        <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-extrabold text-brand-700">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400">{hint}</p>
                  </div>
                  {paymentMethod === id && (
                    <CheckCircle2 size={18} className="text-brand-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Display Canteen Scanner directly when UPI Online is selected */}
            {paymentMethod === 'UPI' && (
              <div className="mt-4">
                <UpiPaymentCard
                  amount={grandTotal}
                  utrNumber={utrNumber}
                  onUtrChange={setUtrNumber}
                />
              </div>
            )}
          </section>

          {/* Order Summary & Pay Button */}
          <section className="card p-5">
            <h2 className="font-display text-base font-bold mb-3 border-b border-ink-100 pb-2 dark:border-ink-800">
              Payment Summary
            </h2>

            {error && (
              <p role="alert" className="mb-3 rounded-lg bg-chili-500/10 px-3 py-2 text-xs font-semibold text-chili-600 dark:text-red-300">
                {error}
              </p>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-600 dark:text-ink-300">
                <dt>Items Subtotal ({count})</dt>
                <dd className="font-semibold">{rupees(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-600 dark:text-ink-300">
                <dt>Delivery Fee</dt>
                <dd className="font-semibold">{fee > 0 ? rupees(fee) : 'FREE'}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-lg font-black dark:border-ink-800">
                <dt>Total Amount</dt>
                <dd className="text-brand-600 dark:text-brand-400">{rupees(grandTotal)}</dd>
              </div>
            </dl>

            <button
              onClick={handleCheckout}
              disabled={isPlacing}
              className="btn-primary mt-5 w-full !py-4 text-base font-black shadow-lg shadow-brand-500/25 active:scale-95"
            >
              {isPlacing ? (
                'Processing Order…'
              ) : user ? (
                `Confirm & Place Order • ${rupees(grandTotal)}`
              ) : (
                'Log in to Place Order'
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-ink-400 flex items-center justify-center gap-1">
              <ShieldCheck size={13} className="text-leaf-600" />
              Direct kitchen confirmation & live order tracking
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
