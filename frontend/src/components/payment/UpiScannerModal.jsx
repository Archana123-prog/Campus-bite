import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode } from 'lucide-react';
import UpiPaymentCard from './UpiPaymentCard';

export default function UpiScannerModal({
  isOpen,
  onClose,
  amount,
  utrNumber,
  onUtrChange,
  showUtrInput = true
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 sm:p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-ink-400 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-ink-950 font-bold">
              <QrCode size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-black">Scan & Pay Online</h2>
              <p className="text-xs text-ink-400 dark:text-ink-300">Complete payment with your preferred UPI app</p>
            </div>
          </div>

          <UpiPaymentCard
            amount={amount}
            utrNumber={utrNumber}
            onUtrChange={onUtrChange}
            showUtrInput={showUtrInput}
          />

          <button
            onClick={onClose}
            className="btn-ghost mt-4 w-full !py-2.5 text-xs font-bold"
          >
            Done / Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
