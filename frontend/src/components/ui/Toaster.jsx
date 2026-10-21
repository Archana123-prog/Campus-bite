import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const STYLES = {
  success: { icon: CheckCircle2, cls: 'bg-leaf-600 text-white' },
  error: { icon: AlertCircle, cls: 'bg-chili-500 text-white' },
  info: { icon: Info, cls: 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type] || STYLES.info;
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex max-w-sm animate-pop items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium shadow-xl ${cls}`}
          >
            <Icon size={16} className="shrink-0" />
            {t.message}
          </button>
        );
      })}
    </div>
  );
}
