import { create } from 'zustand';

const checkIsStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    Boolean(window.__pwaInstalled)
  );
};

const checkIsIos = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
};

const getInitialPrompt = () => {
  if (typeof window === 'undefined') return null;
  return window.__pwaInstallPrompt || null;
};

export const usePwaStore = create((set, get) => {
  const initialPrompt = getInitialPrompt();

  // Register global hooks
  if (typeof window !== 'undefined') {
    window.__onPwaInstallPrompt = (prompt) => {
      set({ deferredPrompt: prompt, isInstallable: true });
    };

    window.__onPwaInstalled = () => {
      set({ isInstalled: true, isInstallable: false, deferredPrompt: null, showInstallModal: false });
    };

    // Also check installed related apps if available
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getInstalledRelatedApps === 'function') {
        navigator.getInstalledRelatedApps().then((apps) => {
          if (apps && apps.length > 0) {
            set({ isInstalled: true, isInstallable: false });
          }
        }).catch(() => {});
      }
    } catch {
      // Ignored if browser sandbox restricts API
    }
  }

  return {
    deferredPrompt: initialPrompt,
    isInstallable: Boolean(initialPrompt),
    isInstalled: checkIsStandalone(),
    isIos: checkIsIos(),
    showInstallBanner: true,
    showInstallModal: false,

    setDeferredPrompt: (prompt) => {
      if (typeof window !== 'undefined') {
        window.__pwaInstallPrompt = prompt;
      }
      set({ deferredPrompt: prompt, isInstallable: true });
    },

    setInstalled: () => {
      if (typeof window !== 'undefined') {
        window.__pwaInstalled = true;
        window.__pwaInstallPrompt = null;
      }
      set({ isInstalled: true, isInstallable: false, deferredPrompt: null, showInstallModal: false });
    },

    dismissBanner: () => {
      set({ showInstallBanner: false });
    },

    openInstallModal: () => {
      set({ showInstallModal: true });
    },

    closeInstallModal: () => {
      set({ showInstallModal: false });
    },

    promptInstall: async () => {
      let prompt = get().deferredPrompt;
      if (!prompt && typeof window !== 'undefined' && window.__pwaInstallPrompt) {
        prompt = window.__pwaInstallPrompt;
      }

      if (!prompt) {
        // If the browser hasn't provided beforeinstallprompt (e.g. desktop Chrome already installed, iOS, or unprompted), open guide modal
        console.log('[PWA] Native deferredPrompt not available. Opening install guide modal.');
        set({ showInstallModal: true });
        return null;
      }

      try {
        console.log('[PWA] Triggering native install prompt...');
        await prompt.prompt();
        const choice = await prompt.userChoice;
        console.log('[PWA] User choice:', choice);
        if (choice && choice.outcome === 'accepted') {
          get().setInstalled();
        } else {
          // If user dismissed, deferredPrompt cannot be called again
          set({ deferredPrompt: null, isInstallable: false });
          if (typeof window !== 'undefined') window.__pwaInstallPrompt = null;
        }
        return choice ? choice.outcome : null;
      } catch (err) {
        console.warn('[PWA] Prompt call error:', err);
        set({ showInstallModal: true });
        return null;
      }
    },
  };
});
