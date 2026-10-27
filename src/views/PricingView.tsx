import React from 'react';
import { PAYMENTS_ENABLED } from '../lib/payments';
import { LicenseStatus } from '../types';

interface PricingViewProps {
  license: LicenseStatus;
  onStartCheckout: () => void;
  onDeactivateKey?: () => void;
  onOpenSandbox: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  license,
  onStartCheckout,
  onDeactivateKey,
  onOpenSandbox,
}) => {
  return (
    <div className="flex flex-col w-full text-ink">
      <div className="relative w-full overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[760px] h-[340px] bg-gradient-to-b from-forest-tint/60 via-paper-sunk/30 to-transparent blur-3xl pointer-events-none rounded-full"></div>

        <section className="relative max-w-[1120px] mx-auto px-6 lg:px-12 pt-12 pb-16 w-full">
          {/* Header */}
          <div className="max-w-[760px] mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
              ONE-TIME PURCHASE
            </div>

            <h1 className="font-headline-lg text-3xl sm:text-5xl text-ink tracking-tight font-display">
              One-time <span className="marker-stroke italic">pricing</span>.
            </h1>

            <p className="font-lead text-base sm:text-xl text-ink-soft max-w-[620px] mx-auto leading-relaxed">
              {PAYMENTS_ENABLED
                ? 'Pay once and keep it. No subscription. Early price ₹199 / $2.'
                : 'Pay once and keep it. No subscription. Buying opens soon: reserve the early price now, with nothing to pay today.'}
            </p>
          </div>

          {/* Pricing Section (One Card Only) */}
          <div className="mt-14 max-w-xl mx-auto">
            <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border-2 border-forest shadow-xl text-left space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-forest-tint/50 rounded-full blur-2xl pointer-events-none"></div>

              <div className="border-b border-paper-line pb-6 space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl sm:text-3xl text-ink font-medium">First Take</h3>
                  <div className="text-right">
                    <span className="font-display text-5xl text-ink font-medium">₹199</span>
                    <span className="font-body-sm text-sm text-ink-soft ml-1.5">/ $2</span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                    Record on any number of scripts and download every take. Every future update. No subscription.
                  </p>
                  <span className="font-body-sm text-xs text-ink-soft shrink-0">Early price, paid once</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-label-eyebrow text-[11px] tracking-widest uppercase text-ink-faint font-bold">
                  EVERYTHING INCLUDED
                </span>
                <ul className="space-y-3.5 font-body-sm text-sm text-ink pt-1">
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Record on unlimited scripts (free: 10)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Unlimited video downloads (free: 3)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Camera &amp; mic recording, saved to your computer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Dark background, and mirrored text for teleprompter glass</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Script follows your voice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Every future update included</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 space-y-3 text-center">
                <button
                  onClick={onStartCheckout}
                  className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-title-md text-base font-semibold hover:bg-forest-dark transition-all duration-150 shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{license.isActive ? 'Active: yours to keep' : PAYMENTS_ENABLED ? 'Buy First Take' : 'Reserve the early price'}</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <p className="font-label-meta text-xs text-ink-soft">
                  Try it free first: record on up to 10 scripts and download 3 videos. No sign-up needed.
                </p>
              </div>
            </div>
          </div>

          {/* Free Sandbox Link */}
          <div className="mt-8 max-w-xl mx-auto p-4 rounded-lg bg-paper-sunk/80 border border-paper-line flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-paper-raised flex items-center justify-center shrink-0 border border-paper-line">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-ink-soft">edit_note</span>
              </span>
              <p className="font-body-sm text-sm text-ink-soft">
                Try the prompter with your own script, free.
              </p>
            </div>
            <button
              onClick={onOpenSandbox}
              className="font-body-sm text-sm text-forest font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Open your scripts →
            </button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-[880px] mx-auto px-6 py-20 w-full space-y-10">
          <div className="text-center space-y-2">
            <span className="font-label-eyebrow text-xs uppercase text-ink-soft tracking-wider font-semibold">
              Before you buy
            </span>
            <h2 className="font-headline-md text-2xl sm:text-3xl text-ink font-display">
              Frequently asked questions
            </h2>
            <p className="font-body-sm text-sm text-ink-soft">
              Paying, refunds, browsers, video files, and where your data is stored.
            </p>
          </div>

          <div className="rounded-xl bg-paper-raised border border-paper-line overflow-hidden shadow-xs">
            <div className="divide-y divide-paper-line">
              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">payments</span>
                    How do I pay, and what happens after?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Payment</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  {PAYMENTS_ENABLED
                    ? 'Sign in with Google, then pay once through Dodo Payments. Your purchase is linked to that Google account and switches on within a few seconds. Dodo Payments emails you the receipt.'
                    : 'Buying opens soon. When it does, you sign in with Google and pay once through Dodo Payments. Your purchase is linked to that Google account, and Dodo Payments emails you the receipt.'}
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">undo</span>
                    Can I get a refund?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Refunds</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Yes. Ask within 14 days of buying and you get the full amount back, no questions asked. There is no
                  subscription, so there is nothing to cancel.{' '}
                  <a href="/refunds" className="text-forest underline hover:text-forest-dark">Read the refund policy</a>.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">web</span>
                    Which browsers and operating systems are supported?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Specs</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  First Take runs in all modern browsers on macOS, Windows, and Linux. Word-by-word voice follow works best in Google Chrome and Microsoft Edge. In browsers without speech recognition, such as Firefox, the script follows the sound of your voice instead.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">videocam</span>
                    What video format do I get?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Formats</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Takes are recorded in your browser as standard <strong>.WebM</strong> (Chrome, Edge, Firefox) or <strong>.MP4</strong> (Safari) video files. Downloads go to your computer’s Downloads folder.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">lock</span>
                    Where are my video recordings and scripts stored?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Privacy</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Videos stay in your browser until you download them. We never upload your takes. Scripts are saved in your browser, and synced to your account only if you sign in. To follow your voice, the browser’s speech recognition may send audio to its provider (for example Google in Chrome).
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px]">sync_alt</span>
                    Can I use First Take across multiple devices?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Licensing</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Yes. Your purchase link unlocks First Take on all your personal devices, with no monthly fee.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
