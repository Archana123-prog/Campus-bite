import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Share, PlusSquare, Monitor, CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { usePwaStore } from '../../store/usePwaStore';

export default function InstallModal() {
  const show = usePwaStore((s) => s.showInstallModal);
  const close = usePwaStore((s) => s.closeInstallModal);
  const isIos = usePwaStore((s) => s.isIos);
  const isInstallable = usePwaStore((s) => s.isInstallable);
  const promptInstall = usePwaStore((s) => s.promptInstall);
  const [attempted, setAttempted] = useState(false);

  const handleInstallClick = async () => {
    setAttempted(true);
    const res = await promptInstall();
    if (!res) {
      console.log('[PWA] Prompt could not open directly. Showing browser instructions.');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute right-4 top-4 rounded-full p-2 text-ink-400 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header with App Icon */}
            <div className="flex items-center gap-4">
              <img
                src="/pwa-192x192.png"
                alt="CampusBite App Icon"
                className="h-16 w-16 rounded-2xl shadow-md ring-2 ring-brand-500/20 object-cover"
              />
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                  <Smartphone size={12} /> Standalone Web App
                </span>
                <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight">
                  Install CampusBite
                </h3>
                <p className="text-xs text-ink-500 dark:text-ink-300">
                  Full-screen experience with no address bar
                </p>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="my-4 space-y-2 rounded-2xl bg-ink-50 p-3.5 text-xs text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                <span>Instant launch directly from your home screen</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                <span>Runs like a native mobile & desktop application</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                <span>Real-time kitchen order alerts & offline menu</span>
              </div>
            </div>

            {/* Action Button: Always shown and clickable */}
            <div className="mt-2 space-y-3">
              <button
                onClick={handleInstallClick}
                className="btn-primary w-full !py-3 text-sm font-bold shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {isInstallable ? 'Install CampusBite Now' : 'Trigger Install Dialog'}
              </button>

              {/* Platform specific instructions if prompt is not native */}
              {isIos ? (
                <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5 text-xs dark:border-ink-800 dark:bg-ink-800/40">
                  <p className="font-semibold text-ink-900 dark:text-white mb-2">
                    How to install on iPhone & iPad:
                  </p>
                  <ol className="space-y-1.5 text-ink-600 dark:text-ink-300">
                    <li className="flex items-center gap-2">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-950">1</span>
                      <span>Tap the <strong>Share</strong> button <Share size={12} className="inline ml-0.5 text-brand-600" /> in Safari.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-950">2</span>
                      <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare size={12} className="inline ml-0.5 text-brand-600" />.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-950">3</span>
                      <span>Tap <strong>Add</strong> in the top right.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5 text-xs dark:border-ink-800 dark:bg-ink-800/40">
                  <div className="flex items-start gap-2.5">
                    <Monitor size={16} className="text-brand-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-ink-900 dark:text-white">
                        Desktop Chrome / Edge 1-Click Install:
                      </p>
                      <p className="text-ink-600 dark:text-ink-300 leading-relaxed">
                        Look at the right end of your browser's address bar (beside the star/bookmark icon) and click the <strong>Install App icon (⊕ or 💻)</strong>, or click the browser menu <strong>⋮ ➔ "Install CampusBite"</strong>.
                      </p>
                      {attempted && !isInstallable && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                          <AlertCircle size={13} /> If already installed, open CampusBite from your desktop shortcut or chrome://apps
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={close}
              className="mt-3 w-full rounded-xl py-2 text-center text-xs font-semibold text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
