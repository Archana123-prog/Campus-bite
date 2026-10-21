import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';
import { usePwaStore } from '../../store/usePwaStore';

export default function PwaInstallBanner() {
  const isInstalled = usePwaStore((s) => s.isInstalled);
  const showBanner = usePwaStore((s) => s.showInstallBanner);
  const dismiss = usePwaStore((s) => s.dismissBanner);
  const promptInstall = usePwaStore((s) => s.promptInstall);

  // If already running as a standalone app, never show install banner
  if (isInstalled || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg md:left-auto md:right-6 md:bottom-6"
        aria-label="Install CampusBite Web App"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-200/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/95">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="CampusBite Icon"
              className="h-11 w-11 shrink-0 rounded-xl shadow ring-1 ring-brand-500/20"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-bold tracking-tight text-ink-900 dark:text-white truncate">
                  CampusBite App
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-500/15 px-1.5 py-0.2 text-[10px] font-bold text-brand-600 dark:text-brand-400 shrink-0">
                  <Sparkles size={9} /> Fast
                </span>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400 truncate">
                Install as standalone app on your device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => promptInstall()}
              className="btn-primary !px-3.5 !py-2 text-xs font-bold shadow-md shadow-brand-500/25"
            >
              <Download size={14} /> Install
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              aria-label="Dismiss install banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
