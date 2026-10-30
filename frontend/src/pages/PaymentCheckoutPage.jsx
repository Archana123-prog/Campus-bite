import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Smartphone,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useCartStore, selectSubtotal, selectCount } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import FoodImage from '../components/ui/FoodImage';
import { toast } from '../store/useToastStore';
import { rupees } from '../utils/format';
import { api } from '../services/api';

const MODES = [
  { type: 'HOSTEL_DELIVERY', label: 'Hostel Delivery', hint: 'Delivered to room', icon: Bike },
  { type: 'DINE_IN', label: 'Dine In / Table', hint: 'Served at canteen table', icon: Armchair },
  { type: 'TAKEAWAY', label: 'Takeaway / Pickup', hint: 'Collect at counter', icon: ShoppingBag },
];

const PENDING_PAYMENT_KEY = 'pet-pooja-pending-payment';

let razorpaySdkPromise = null;
function loadRazorpaySdk() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (razorpaySdkPromise) return razorpaySdkPromise;

  razorpaySdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else {
        razorpaySdkPromise = null;
        reject(new Error('Razorpay checkout loaded without payment SDK.'));
      }
    };
    script.onerror = () => {
      razorpaySdkPromise = null;
      reject(new Error('Razorpay checkout could not load. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });

  return razorpaySdkPromise;
}

export default function PaymentCheckoutPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [activeQrTab, setActiveQrTab] = useState('dynamic'); // 'dynamic' | 'fampay'
  const [showGatewayOption, setShowGatewayOption] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null);

  const cart = useCartStore((s) => s.cart);
  const orderType = useCartStore((s) => s.orderType);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const hostelBlock = useCartStore((s) => s.hostelBlock);
  const roomNumber = useCartStore((s) => s.roomNumber);
  const notes = useCartStore((s) => s.notes);
  const isPlacing = useCartStore((s) => s.isPlacing);
  const error = useCartStore((s) => s.error);

  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const setHostel = useCartStore((s) => s.setHostel);
  const setNotes = useCartStore((s) => s.setNotes);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectCount);
  const user = useAuthStore((s) => s.user);
  const { hostelBlocks, deliveryFee, upiId: configuredUpiId, upiName: configuredUpiName, razorpayKeyId } = useConfigStore();

  const upiId = configuredUpiId || 'hayaarav@fam';
  const upiName = configuredUpiName || 'Pet Pooja';

  const fee = orderType === 'HOSTEL_DELIVERY' ? deliveryFee : 0;
  const grandTotal = subtotal + fee;

  // Build standard UPI intent string
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('PetPooja-Order')}`;

  // Prefill default hostel details from user's profile if empty
  useEffect(() => {
    if (user?.hostelBlock && !hostelBlock) {
      setHostel(user.hostelBlock, user.roomNumber || '');
    }
  }, [user, hostelBlock, setHostel]);

  // Restore pending payment intent if page was refreshed
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.paymentIntentId) {
          setPendingIntent(parsed);
        }
      }
    } catch {
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    }
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success(`UPI ID copied: ${upiId}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePasteUtr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().replace(/\s+/g, '');
      if (cleaned) {
        setUtr(cleaned);
        toast.info('Pasted from clipboard');
      }
    } catch {
      toast.info('Please type or paste your 12-digit UTR manually.');
    }
  };

  const validateOrderInputs = () => {
    if (!user) {
      toast.info('Please log in to place your order. Your items are saved.');
      navigate('/login', { state: { from: '/checkout' } });
      return false;
    }

    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      toast.error('Please enter your table number.');
      return false;
    }

    if (orderType === 'HOSTEL_DELIVERY' && (!hostelBlock || !roomNumber.trim())) {
      toast.error('Please select your hostel block and enter your room number.');
      return false;
    }

    return true;
  };

  // ─── Primary Method: Direct UPI Payment Verification ───
  const handleVerifyUpiPayment = async (e) => {
    e?.preventDefault();
    if (!validateOrderInputs()) return;

    const cleanedUtr = utr.trim().replace(/\s+/g, '');
    if (!cleanedUtr) {
      toast.error('Please enter the 12-digit UPI Reference Number / UTR from your payment app.');
      return;
    }

    if (cleanedUtr.length < 8 || cleanedUtr.length > 30) {
      toast.error('Invalid UTR format. Please enter the valid 12-digit reference number from your receipt.');
      return;
    }

    useCartStore.setState({ isPlacing: true, error: null });

    try {
      // Step 1: Create or reuse payment intent
      let intentId = pendingIntent?.paymentIntentId;

      if (!intentId) {
        const orderRes = await api.post('/payments/create-order', {
          orderType,
          tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() : undefined,
          hostelBlock: orderType === 'HOSTEL_DELIVERY' ? hostelBlock : undefined,
          roomNumber: orderType === 'HOSTEL_DELIVERY' ? roomNumber.trim() : undefined,
          notes,
          items: cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        });
        intentId = orderRes.data.paymentIntentId || orderRes.data.razorpayOrderId;
        const newIntent = { paymentIntentId: intentId, amount: orderRes.data.amount };
        setPendingIntent(newIntent);
        sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(newIntent));
      }

      // Step 2: Verify the payment with the provided 12-digit UTR
      const verifyRes = await api.post('/payments/verify', {
        paymentIntentId: intentId,
        utr: cleanedUtr,
      });

      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      setPendingIntent(null);
      setUtr('');
      useCartStore.setState({ cart: [], notes: '', isPlacing: false, isOpen: false });

      toast.success(`Order #${verifyRes.data.orderNumber} placed & payment verified successfully!`);
      navigate(`/track/${verifyRes.data.id}`);
    } catch (err) {
      useCartStore.setState({ isPlacing: false, error: err.message });
      toast.error(err.message || 'Payment verification failed. Please check the UTR number and retry.');
    }
  };

  // ─── Optional Fallback: Razorpay Gateway ───
  const handleRazorpayPayment = async () => {
    if (!validateOrderInputs()) return;
    if (!razorpayKeyId) {
      toast.error('Online card gateway is not configured. Please use UPI payment above.');
      return;
    }

    useCartStore.setState({ isPlacing: true, error: null });
    try {
      await loadRazorpaySdk();
    } catch (sdkError) {
      useCartStore.setState({ isPlacing: false, error: sdkError.message });
      toast.error(sdkError.message);
      return;
    }

    let rzpOrderData;
    try {
      const res = await api.post('/payments/create-order', {
        provider: 'razorpay',
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

    const options = {
      key: rzpOrderData.keyId,
      amount: rzpOrderData.amount,
      currency: rzpOrderData.currency,
      name: 'Pet Pooja',
      description: 'Canteen Order Payment',
      order_id: rzpOrderData.razorpayOrderId,
      prefill: { name: user?.fullName || '', contact: user?.phone || '' },
      theme: { color: '#EF4444' },
      handler: async (response) => {
        try {
          const verify = await api.post('/payments/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          sessionStorage.removeItem(PENDING_PAYMENT_KEY);
          useCartStore.setState({ cart: [], notes: '', isPlacing: false, isOpen: false });
          toast.success(`Order #${verify.data.orderNumber} placed & paid successfully!`);
          navigate(`/track/${verify.data.id}`);
        } catch (vErr) {
          useCartStore.setState({ isPlacing: false, error: vErr.message });
          toast.error(vErr.message || 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: () => useCartStore.setState({ isPlacing: false }),
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', ({ error: pErr }) => {
        const msg = pErr?.description || 'Payment was not completed.';
        useCartStore.setState({ isPlacing: false, error: msg });
        toast.error(msg);
      });
      rzp.open();
    } catch (err) {
      useCartStore.setState({ isPlacing: false, error: err.message });
      toast.error(err.message || 'Could not open payment checkout.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-300">
            <ShoppingBag size={32} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-black">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
            Add delicious meals to your cart or choose a dish from the menu to proceed with checkout.
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
          className="flex items-center gap-1.5 text-xs font-bold text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span className="chip bg-leaf-500/15 text-leaf-700 dark:text-leaf-300">
          <ShieldCheck size={14} /> Direct UPI · Instant Verification
        </span>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
          Order Checkout & Payment
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
          Pay easily via any UPI app or QR scanner, then confirm your order with your 12-digit UTR.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1.1fr]">
        {/* Left column: Ordered Dishes & Delivery details */}
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
                    <p className="text-xs text-ink-400 dark:text-ink-300">
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
                      className="ml-2 p-1 text-ink-400 hover:text-chili-500 dark:text-ink-300"
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
                      : 'border-ink-100 dark:border-ink-800 text-ink-500 dark:text-ink-300 hover:border-ink-200'
                  }`}
                >
                  <Icon size={20} className={orderType === type ? 'text-brand-600' : 'text-ink-400 dark:text-ink-300'} />
                  <span className="mt-1 text-xs font-bold">{label}</span>
                  <span className="text-[10px] text-ink-400 dark:text-ink-300 line-clamp-1">{hint}</span>
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

        {/* Right column: UPI Payment QR, Direct Mobile Pay, & UTR Verification */}
        <div className="space-y-6">
          {/* Main UPI Payment Card */}
          <section className="card overflow-hidden p-5 border-2 border-brand-500/40">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-ink-950">
                  <QrCode size={18} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold">UPI Payment & Verification</h2>
                  <p className="text-[11px] text-ink-400 dark:text-ink-300">Scan QR or tap to open UPI App</p>
                </div>
              </div>
              <span className="chip bg-leaf-500/15 text-leaf-700 dark:text-leaf-300 text-[11px]">
                <CheckCircle2 size={13} /> Active
              </span>
            </div>

            {/* Merchant UPI ID bar */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-100/70 p-3 dark:bg-ink-800/80">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-300">
                  Merchant UPI ID (FamPay)
                </p>
                <p className="font-mono text-sm font-extrabold text-ink-900 dark:text-white truncate">
                  {upiId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="btn-ghost !px-3 !py-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 shrink-0 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-leaf-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy ID
                  </>
                )}
              </button>
            </div>

            {/* QR Code Tab Selector */}
            <div className="mt-4 flex rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
              <button
                type="button"
                onClick={() => setActiveQrTab('dynamic')}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  activeQrTab === 'dynamic'
                    ? 'bg-white shadow-sm text-ink-950 dark:bg-ink-700 dark:text-white'
                    : 'text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
                }`}
              >
                Auto-Amount QR ({rupees(grandTotal)})
              </button>
              <button
                type="button"
                onClick={() => setActiveQrTab('fampay')}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold transition ${
                  activeQrTab === 'fampay'
                    ? 'bg-white shadow-sm text-ink-950 dark:bg-ink-700 dark:text-white'
                    : 'text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
                }`}
              >
                Official FamPay QR
              </button>
            </div>

            {/* QR Code Display Box */}
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-ink-100 bg-white p-5 shadow-inner dark:border-ink-800 dark:bg-ink-950">
              {activeQrTab === 'dynamic' ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-sm">
                    <QRCodeSVG
                      value={upiIntentUrl}
                      size={190}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs font-extrabold text-ink-900 dark:text-white">
                    Scan with GPay, PhonePe, FamPay or Paytm
                  </p>
                  <p className="text-center text-[11px] text-ink-400 dark:text-ink-300">
                    Amount is pre-filled: <span className="font-bold text-brand-600 dark:text-brand-400">{rupees(grandTotal)}</span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-sm">
                    <img
                      src="/upi-qr.png"
                      alt="FamPay UPI QR Code"
                      className="h-48 w-48 rounded-lg object-contain"
                    />
                  </div>
                  <p className="mt-3 text-center text-xs font-extrabold text-ink-900 dark:text-white">
                    Official FamPay Merchant QR
                  </p>
                  <p className="text-center text-[11px] text-ink-400 dark:text-ink-300">
                    Recipient: <span className="font-mono font-bold">{upiId}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Mobile One-Tap Pay Button */}
            <div className="mt-4">
              <a
                href={upiIntentUrl}
                className="btn-primary flex items-center justify-center gap-2 w-full !py-3 text-sm font-black shadow-md shadow-brand-500/20 active:scale-95"
              >
                <Smartphone size={16} />
                Pay via UPI App · {rupees(grandTotal)}
                <ExternalLink size={14} />
              </a>
              <p className="mt-1.5 text-center text-[11px] text-ink-400 dark:text-ink-300">
                Tap to open installed UPI app on your phone (GPay, PhonePe, FamPay, etc.)
              </p>
            </div>
          </section>

          {/* Payment Verification Form */}
          <section className="card p-5 border border-brand-500/30">
            <h2 className="font-display text-base font-bold flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-leaf-600" />
              Verify & Confirm Order
            </h2>

            {/* 3 Step Instruction Guide */}
            <div className="mb-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-600 dark:bg-ink-900/60 dark:text-ink-300 space-y-1.5">
              <p className="font-bold text-ink-900 dark:text-white">How verification works:</p>
              <div className="flex items-start gap-2">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-ink-950">1</span>
                <span>Complete the payment of <strong>{rupees(grandTotal)}</strong> to <strong>{upiId}</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-ink-950">2</span>
                <span>Copy the <strong>12-digit UPI Reference Number / UTR</strong> from your receipt screen.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-ink-950">3</span>
                <span>Paste the UTR number below and click <strong>Verify Payment & Place Order</strong>.</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="mb-3 rounded-lg bg-chili-500/10 px-3 py-2 text-xs font-semibold text-chili-600 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </p>
            )}

            <form onSubmit={handleVerifyUpiPayment} className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label !mb-1" htmlFor="checkout-utr">
                    12-Digit UPI Reference No. (UTR)
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteUtr}
                    className="text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Paste from clipboard
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="checkout-utr"
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. 430291827465"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\s+/g, ''))}
                    className="input font-mono tracking-wider font-bold text-base !py-3 uppercase"
                  />
                  {utr.trim().length >= 8 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-leaf-600 dark:text-leaf-400">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-300">
                  Found on your payment success receipt as "UPI Ref No.", "UTR", or "Transaction ID".
                </p>
              </div>

              {/* Price Breakdown */}
              <dl className="space-y-2 border-t border-ink-100 pt-3 text-sm dark:border-ink-800">
                <div className="flex justify-between text-ink-600 dark:text-ink-300">
                  <dt>Items Subtotal ({count})</dt>
                  <dd className="font-semibold">{rupees(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-ink-600 dark:text-ink-300">
                  <dt>Delivery Fee</dt>
                  <dd className="font-semibold">{fee > 0 ? rupees(fee) : 'FREE'}</dd>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-lg font-black dark:border-ink-800">
                  <dt>Total Amount</dt>
                  <dd className="text-brand-600 dark:text-brand-400">{rupees(grandTotal)}</dd>
                </div>
              </dl>

              {/* Submit Verification Button */}
              <button
                type="submit"
                disabled={isPlacing || !user}
                className="btn-primary w-full !py-4 text-base font-black shadow-lg shadow-brand-500/25 active:scale-95"
              >
                {isPlacing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock size={18} className="animate-spin" /> Verifying payment with canteen…
                  </span>
                ) : user ? (
                  `Verify Payment & Place Order · ${rupees(grandTotal)}`
                ) : (
                  'Log in to pay'
                )}
              </button>
            </form>

            {/* Optional Card Gateway Accordion */}
            {razorpayKeyId && (
              <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
                <button
                  type="button"
                  onClick={() => setShowGatewayOption(!showGatewayOption)}
                  className="flex items-center justify-between w-full text-xs font-bold text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                >
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={14} /> Prefer Debit / Credit Card or NetBanking?
                  </span>
                  <span>{showGatewayOption ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showGatewayOption && (
                  <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/50 p-3 dark:border-ink-700 dark:bg-ink-900/40">
                    <p className="text-xs text-ink-500 dark:text-ink-300 mb-2">
                      You can also complete your payment through the card / netbanking gateway.
                    </p>
                    <button
                      type="button"
                      onClick={handleRazorpayPayment}
                      disabled={isPlacing}
                      className="btn-ghost w-full border border-ink-300 text-xs font-bold dark:border-ink-700"
                    >
                      Open Card / NetBanking Checkout
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
