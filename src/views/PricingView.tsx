import React, { useState } from 'react';
import { LicenseStatus } from '../types';

interface PricingViewProps {
  license: LicenseStatus;
  onActivateKey: (key: string) => boolean;
  onDeactivateKey: () => void;
  onOpenSandbox: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  license,
  onActivateKey,
  onDeactivateKey,
  onOpenSandbox,
}) => {
  const [inputKey, setInputKey] = useState(license.key || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleActivationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsVerifying(true);
    setFeedbackMsg('');

    setTimeout(() => {
      const success = onActivateKey(inputKey.trim());
      setIsVerifying(false);
      if (success) {
        setFeedbackMsg('License successfully activated! PRO tier unlocked.');
      } else {
        setFeedbackMsg('Invalid license key format. Please check your Gumroad receipt.');
      }
    }, 700);
  };

  const handleBuy = () => {
    const mockKey = `FT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setInputKey(mockKey);
    onActivateKey(mockKey);
    alert(`Thank you for purchasing First Take ($19, once). License key generated: ${mockKey}. Your copy is now activated on this browser.`);
  };

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
              SIMPLE PRICING
            </div>

            <h1 className="font-headline-lg text-3xl sm:text-5xl text-ink tracking-tight font-display">
              Simple pricing for founders.
            </h1>

            <p className="font-lead text-base sm:text-xl text-ink-soft max-w-[620px] mx-auto leading-relaxed">
              No subscriptions required. Keep your scripts, record unlimited takes, and remove the watermark.
            </p>
          </div>

          {/* Pricing Section (One Card Only) */}
          <div className="mt-14 max-w-xl mx-auto">
            <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border-2 border-forest shadow-xl text-left space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-forest-tint/50 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-paper-line pb-6">
                <div>
                  <h3 className="font-headline-lg text-2xl sm:text-3xl font-display text-ink font-semibold">
                    First Take
                  </h3>
                  <p className="font-body-sm text-sm text-ink-soft mt-1 leading-relaxed">
                    Unlimited scripts, unlimited recording, every future update. No subscription.
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-ink">$19</span>
                  <span className="font-label-meta text-xs text-ink-soft">, once</span>
                </div>
              </div>

              <ul className="space-y-3.5 font-body-sm text-sm text-ink">
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
                  <span>Local camera export</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <span>Night paper &amp; optical beam splitter mirror modes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <span>Every future update included</span>
                </li>
              </ul>

              <div className="pt-4 space-y-3 text-center">
                <button
                  onClick={handleBuy}
                  className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-body-sm text-base font-semibold hover:bg-forest-dark transition-all duration-150 shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{license.isActive ? 'First Take Active' : 'Buy First Take — $19'}</span>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
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

        {/* License Key Section */}
        <section className="w-full bg-paper-sunk/60 border-t border-b border-paper-line py-16">
          <div className="max-w-[760px] mx-auto px-6">
            <div className="p-8 rounded-xl bg-paper-raised border border-paper-line shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-paper-line">
                <div>
                  <span className="font-label-eyebrow text-xs uppercase text-forest font-semibold tracking-wider">
                    License Management
                  </span>
                  <h2 className="font-headline-md text-2xl text-ink mt-1 font-display">Already bought on Gumroad?</h2>
                  <p className="font-body-sm text-sm text-ink-soft mt-1">
                    Enter your license key below to unlock your studio copy instantly on this device.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-paper-sunk text-ink-soft font-label-meta text-xs shrink-0 border border-paper-line/50">
                  <span
                    className={`w-2 h-2 rounded-full ${license.isActive ? 'bg-forest' : 'bg-ink-faint'}`}
                  ></span>
                  <span>License Status: {license.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleActivationSubmit}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-soft">
                      <span className="material-symbols-outlined text-[18px]">key</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Paste your Gumroad license key (e.g. 8F2D1A-987B-4E32)..."
                      className="w-full h-11 pl-10 pr-4 rounded-lg bg-paper-raised text-ink border border-paper-line-strong font-label-meta text-xs placeholder:text-ink-faint focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="h-11 px-6 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-semibold hover:bg-forest-dark transition-colors duration-150 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isVerifying ? 'Verifying...' : 'Activate key'}</span>
                    <span className="material-symbols-outlined text-[18px]">
                      {isVerifying ? 'sync' : 'check'}
                    </span>
                  </button>
                </div>

                {feedbackMsg && (
                  <p className="font-body-sm text-xs text-forest font-medium">{feedbackMsg}</p>
                )}

                <p className="font-label-meta text-[11px] text-ink-faint">
                  Can't find your key? Check your Gumroad receipt email or search for "First Take Studio License".
                </p>
              </form>

              {/* Activated Success Status Box */}
              {license.isActive && (
                <div className="p-4 rounded-lg bg-forest-tint border-l-4 border-forest flex items-start gap-3.5 transition-all duration-300">
                  <span className="material-symbols-outlined text-forest text-[22px] shrink-0 mt-0.5">verified</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-title-md text-sm sm:text-base font-semibold text-ink">
                        First Take License Active
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-white/70 text-forest font-label-meta text-[10px] font-bold uppercase">
                        PRO TIER
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-ink-soft leading-relaxed">
                      All capabilities enabled: unlimited scripts, mirror teleprompter, and local offline retention.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-3 font-label-meta text-xs text-forest">
                      <span>Seat: Solo Founder</span>
                      <span>•</span>
                      <span>Type: One-time License</span>
                      <span>•</span>
                      <button
                        onClick={onDeactivateKey}
                        className="underline cursor-pointer hover:text-forest-dark"
                      >
                        Deactivate on this machine
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                  First Take supports all modern evergreen browsers including Google Chrome, Apple Safari, Brave, Microsoft Edge, and Firefox on macOS, Windows, and Linux.
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
                  Exports are processed locally inside browser memory as standard <strong>.MP4</strong> or <strong>.WebM</strong> video files. Files are directly saved to your computer’s Downloads folder.
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
                  Exclusively on your local disk inside your browser’s IndexedDB. We do not maintain any cloud databases or video servers.
                </p>
              </div>

              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-title-md text-base font-semibold text-ink flex items-center gap-2">
                    <span className="material-symbols-outlined text-forest text-[20px]">sync_alt</span>
                    Can I use my license across multiple computers?
                  </h3>
                  <span className="font-label-meta text-xs text-ink-faint">Licensing</span>
                </div>
                <p className="font-body-md text-sm text-ink-soft leading-relaxed pl-7">
                  Yes. You are licensed to unlock First Take on all your personal computers using the same license key.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
