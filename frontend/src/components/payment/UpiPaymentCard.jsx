import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Info
} from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { rupees } from '../../utils/format';
import { useConfigStore } from '../../store/useConfigStore';

export default function UpiPaymentCard({
  amount = 0,
  utrNumber = '',
  onUtrChange,
  showUtrInput = true,
  className = ''
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const configUpiId = useConfigStore((s) => s.upiId) || '7488325002@upi';
  const configUpiName = useConfigStore((s) => s.upiName) || 'Archana Kumari';
  const upiQrImage = useConfigStore((s) => s.upiQrImage) || '/canteen-scanner.jpg';

  // Format amount to standard decimal for UPI deep link (e.g. 150.00)
  const formattedAmount = Number(amount || 0).toFixed(2);
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(configUpiId)}&pn=${encodeURIComponent(configUpiName)}&am=${formattedAmount}&cu=INR&tn=CampusBite%20Order`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      toast.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedAmount(true);
      toast.success('Amount copied to clipboard!');
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className={`rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/5 via-white to-white p-4 sm:p-5 shadow-sm dark:bg-ink-900 dark:from-brand-500/10 dark:via-ink-900 dark:to-ink-900 ${className}`}>
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-ink-950 font-bold shadow-sm">
            <QrCode size={18} />
          </div>
          <div>
            <h3 className="font-display text-sm font-extrabold text-ink-900 dark:text-white">
              Canteen UPI Online Scanner
            </h3>
            <p className="text-[11px] text-ink-500 dark:text-ink-300">
              Pay securely via any UPI App (GPay, PhonePe, Paytm, BHIM)
            </p>
          </div>
        </div>
        <span className="chip bg-leaf-500/15 text-leaf-700 dark:text-leaf-300 font-extrabold shrink-0">
          <ShieldCheck size={12} /> Instant Pay
        </span>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[160px_1fr] items-center">
        {/* Actual QR Scanner Image */}
        <div className="flex flex-col items-center">
          <div className="relative overflow-hidden rounded-2xl border-2 border-brand-500 bg-white p-1.5 shadow-md group">
            <img
              src={upiQrImage}
              alt="Canteen UPI Scanner QR"
              className="h-36 w-36 object-contain rounded-xl"
            />
            <div className="absolute inset-0 bg-ink-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl pointer-events-none">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink-900 shadow">
                Scan & Pay
              </span>
            </div>
          </div>
          <span className="mt-1.5 text-center text-[10px] font-semibold text-ink-400 dark:text-ink-300">
            Scan with any UPI App
          </span>
        </div>

        {/* UPI Details & 1-Tap Payment Link */}
        <div className="space-y-3">
          {/* Payee Info */}
          <div className="rounded-xl bg-ink-50 p-2.5 text-xs dark:bg-ink-800/60">
            <div className="flex items-center justify-between">
              <span className="text-ink-400 font-medium dark:text-ink-300">Payee Name:</span>
              <span className="font-bold text-ink-900 dark:text-white">{configUpiName}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-ink-100 pt-1.5 dark:border-ink-700/60">
              <span className="text-ink-400 font-medium dark:text-ink-300">UPI ID:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-brand-700 dark:text-brand-400">
                <span>{configUpiId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(configUpiId, 'id')}
                  className="rounded-md p-1 hover:bg-ink-200 dark:hover:bg-ink-700 text-ink-600 dark:text-ink-300"
                  title="Copy UPI ID"
                >
                  {copiedId ? <Check size={13} className="text-leaf-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Amount to pay */}
          <div className="flex items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2 text-xs font-bold text-brand-900 dark:text-brand-200 border border-brand-500/20">
            <span>Payable Amount:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base font-black text-brand-600 dark:text-brand-400">
                {rupees(amount)}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(formattedAmount, 'amount')}
                className="rounded p-0.5 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300"
                title="Copy Amount"
              >
                {copiedAmount ? <Check size={13} className="text-leaf-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Mobile 1-Tap Pay Button */}
          <a
            href={upiDeepLink}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-extrabold text-ink-950 shadow-md transition hover:bg-brand-400 active:scale-95"
          >
            <Smartphone size={15} />
            <span>Pay via UPI App (GPay / PhonePe / Paytm)</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* UTR / Transaction reference input */}
      {showUtrInput && (
        <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
          <label className="label !text-xs" htmlFor="upi-utr-input">
            UPI Reference / UTR Number (Optional)
          </label>
          <div className="relative mt-1">
            <input
              id="upi-utr-input"
              type="text"
              className="input !py-2 !text-xs font-mono"
              placeholder="e.g. 429381928491 (last 4-12 digits)"
              maxLength={20}
              value={utrNumber}
              onChange={(e) => onUtrChange && onUtrChange(e.target.value.trim())}
            />
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400 dark:text-ink-300">
            <Info size={11} /> Enter your UPI payment UTR or reference number to help canteen verify instantly.
          </p>
        </div>
      )}
    </div>
  );
}
