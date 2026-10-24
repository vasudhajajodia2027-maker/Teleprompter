import React, { useEffect, useState } from 'react';

// Clarity (index.html) loads only after the visitor accepts analytics.
// The choice is kept in localStorage; "Cookie settings" in the footer
// reopens this banner.
export const CONSENT_KEY = 'ft_analytics_consent';
export const OPEN_CONSENT_EVENT = 'ft:open-consent';

type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    ftLoadClarity?: () => void;
    clarity?: (...args: unknown[]) => void;
  }
}

function readChoice(): Choice | null {
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'granted' || saved === 'denied') return saved;
  } catch (e) {
    console.warn(e);
  }
  return null;
}

export const ConsentBanner: React.FC = () => {
  const [open, setOpen] = useState<boolean>(() => readChoice() === null);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const choose = (choice: Choice) => {
    const previous = readChoice();
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch (e) {
      console.warn(e);
    }
    setOpen(false);
    if (choice === 'granted') {
      window.ftLoadClarity?.();
      window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    } else if (previous === 'granted') {
      // Withdrawn: tell Clarity to erase its cookies, then reload without it.
      window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      window.location.reload();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics cookies"
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[60] p-5 rounded-xl bg-paper-raised border border-paper-line shadow-xl text-ink font-body-sm"
    >
      <p className="text-sm leading-relaxed">
        Can we use Microsoft Clarity cookies to see how people use First Take? It helps us fix problems. Your scripts are
        never recorded.{' '}
        <a href="/privacy" className="text-forest underline hover:text-forest-dark">
          Privacy policy
        </a>
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => choose('granted')}
          className="flex-1 px-4 py-2 rounded-lg bg-forest text-on-forest text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer"
        >
          Accept
        </button>
        <button
          onClick={() => choose('denied')}
          className="flex-1 px-4 py-2 rounded-lg bg-paper-sunk text-ink text-sm font-medium border border-paper-line hover:bg-paper transition-colors cursor-pointer"
        >
          Decline
        </button>
      </div>
    </div>
  );
};
