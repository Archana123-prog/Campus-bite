import { usePwaStore } from './store/usePwaStore';

export function registerPwa() {
  if (typeof window === 'undefined') return;

  // Check if early prompt was already captured in index.html
  if (window.__pwaInstallPrompt) {
    usePwaStore.getState().setDeferredPrompt(window.__pwaInstallPrompt);
  }

  const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.port === '5173' || window.location.port === '5174';

  // In local development, unregister any existing service worker to prevent cache traps and page freezes
  if (isDev && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('[PWA] Unregistered stale service worker in dev:', reg.scope);
        });
      }
    }).catch(() => {});
    return;
  }

  // Register service worker in production
  if ('serviceWorker' in navigator) {
    const doRegister = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker active with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      doRegister();
    } else {
      window.addEventListener('load', doRegister);
    }
  }

  // Intercept beforeinstallprompt for standalone installation
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    console.log('[PWA] Standalone install prompt captured in React runtime');
    window.__pwaInstallPrompt = e;
    usePwaStore.getState().setDeferredPrompt(e);
  });

  // App installed event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] CampusBite standalone web app installed');
    window.__pwaInstalled = true;
    window.__pwaInstallPrompt = null;
    usePwaStore.getState().setInstalled();
  });
}
