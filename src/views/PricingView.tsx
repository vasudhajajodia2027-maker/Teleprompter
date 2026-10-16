import React from 'react';
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
              INVEST ONCE · RECORD FOREVER
            </div>

            <h1 className="font-headline-lg text-3xl sm:text-5xl text-ink tracking-tight font-display">
              Simple pricing for founders.
            </h1>

            <p className="font-lead text-base sm:text-xl text-ink-soft max-w-[620px] mx-auto leading-relaxed">
              No subscriptions required. Keep your scripts, record unlimited takes, and remove all limits.
            </p>
          </div>

          {/* Pricing Section (One Card Only) */}
          <div className="mt-14 max-w-xl mx-auto">
            <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border-2 border-forest shadow-xl text-left space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-forest-tint/50 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-paper-line pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-lg text-2xl sm:text-3xl font-display text-ink font-semibold">
                      First Take
                    </h3>
                    <span className="font-label-meta text-[10px] tracking-widest uppercase bg-forest-tint text-forest px-2.5 py-0.5 rounded font-bold">
                      ONE-TIME
                    </span>
                  </div>
                  <p className="font-body-sm text-sm text-ink-soft mt-1 leading-relaxed">
                    Unlimited scripts, unlimited recording, every future update. No subscription.
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-ink">$19</span>
                  <span className="font-label-meta text-xs text-ink-soft">, once</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-label-eyebrow text-[11px] tracking-widest uppercase text-ink-faint font-bold">
                  EVERYTHING INCLUDED
                </span>
                <ul className="space-y-3.5 font-body-sm text-sm text-ink pt-1">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Unlimited scripts in your library</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Unlimited recording takes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Camera &amp; mic recording, saved to your computer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Night paper &amp; optical mirror modes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Script follows your voice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>Every future update included</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 space-y-3 text-center">
                <button
                  onClick={onStartCheckout}
                  className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-title-md text-base font-semibold hover:bg-forest-dark transition-all duration-150 shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{license.isActive ? 'Active — Yours Forever' : 'Get First Take — $19 (coming soon)'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <p className="font-label-meta text-xs text-ink-soft">
                  Try the free demo first, no signup.
                </p>
              </div>
            </div>
          </div>

          {/* Free Sandbox Link */}
          <div className="mt-8 max-w-xl mx-auto p-4 rounded-lg bg-paper-sunk/80 border border-paper-line flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-paper-raised flex items-center justify-center shrink-0 border border-paper-line">
                <span className="material-symbols-outlined text-[18px] text-ink-soft">edit_note</span>
              </span>
              <p className="font-body-sm text-sm text-ink-soft">
                Test the browser prompter sandbox with your pitch script.
              </p>
            </div>
            <button
              onClick={onOpenSandbox}
              className="font-body-sm text-sm text-forest font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Open Sandbox →
            </button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-[880px] mx-auto px-6 py-20 w-full space-y-10">
          <div className="text-center space-y-2">
            <span className="font-label-eyebrow text-xs uppercase text-ink-soft tracking-wider font-semibold">
              Specifications &amp; Clarity
            </span>
            <h2 className="font-headline-md text-2xl sm:text-3xl text-ink font-display">
              Frequently Asked Questions
            </h2>
            <p className="font-body-sm text-sm text-ink-soft">
              Everything you need to know about the local recording engine.
            </p>
          </div>

          <div className="rounded-xl bg-paper-raised border border-paper-line overflow-hidden shadow-xs">
            <div className="divide-y divide-paper-line">
              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span className="material-symbols-outlined text-forest text-[20px]">web</span>
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
                    <span className="material-symbols-outlined text-forest text-[20px]">videocam</span>
                    What video formats and resolutions can I export?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Formats</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Takes are recorded in your browser as standard <strong>.WebM</strong> (Chrome, Edge, Firefox) or <strong>.MP4</strong> (Safari) video files. Files are directly saved to your computer’s Downloads folder.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span className="material-symbols-outlined text-forest text-[20px]">lock</span>
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
                    <span className="material-symbols-outlined text-forest text-[20px]">sync_alt</span>
                    Can I use First Take across multiple devices?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Licensing</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Yes. Your purchase link unlocks First Take across all your personal devices without monthly subscription fees.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
