import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";

// ─── iOS "Add to Home Screen" Prompt ─────────────────────────────────
// iOS Safari doesn't fire `beforeinstallprompt`, so we show a manual
// guide explaining how to install the app via the Share menu.
// Only shown on iOS Safari when not already in standalone mode.

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

export function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari, not already installed, and not dismissed recently
    if (!isIOS() || isInStandaloneMode()) return;

    const dismissed = localStorage.getItem("ios-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Don't show again for 7 days after dismissal
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Delay showing the prompt so it doesn't compete with the login screen
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("ios-install-dismissed", String(Date.now()));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <img src="/icons/icon-180.png" alt="" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Install Bike Shop</h3>
              <button onClick={dismiss} className="p-1 -m-1 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add this app to your home screen for quick access and a full-screen experience.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                Tap <Share size={14} className="text-blue-500 inline" />
              </span>
              <span className="text-gray-300">then</span>
              <span className="flex items-center gap-1">
                <PlusSquare size={14} className="text-gray-500 inline" /> Add to Home Screen
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
