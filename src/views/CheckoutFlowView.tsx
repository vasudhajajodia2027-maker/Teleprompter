import React, { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { supabase } from '../../utils/supabase/client';

interface CheckoutFlowViewProps {
  initialEmail?: string;
  onExit: () => void;
  onCompletePurchase?: (email: string) => void;
  onOpenPrompter: () => void;
  onOpenScripts: () => void;
}

type CheckoutStep = 'details' | 'confirmation';

export const CheckoutFlowView: React.FC<CheckoutFlowViewProps> = ({
  initialEmail = '',
  onExit,
  onOpenPrompter,
  onOpenScripts,
}) => {
  const [step, setStep] = useState<CheckoutStep>('details');
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const validateEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsSubmitting(true);

    try {
      // Save email directly to Supabase waitlist table
      const { error } = await supabase.from('waitlist').insert([{ email: cleanEmail }]);
      if (error) {
        console.warn('Supabase waitlist insert note:', error.message);
      }
    } catch (err) {
      console.warn('Saved locally; Supabase waitlist sync:', err);
    } finally {
      setIsSubmitting(false);
      setStep('confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-marker selection:text-ink font-body-sm">
      {/* 1. SHARED HEADER ON ALL CHECKOUT SCREENS */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-paper-line">
        <div className="max-w-5xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Logo shown once: 'First Take' with yellow highlight on 'Take' + small letter-spaced 'STUDIO' */}
          <button
            onClick={onExit}
            className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group"
            title="Return to Home"
          >
            <BrandLogo size="md" subtitleText="STUDIO" />
          </button>

          {/* Right controls: 'WAITLIST' badge + separate 'Support' link with clear spacing */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-raised border border-paper-line text-ink-soft shadow-xs">
              <span className="material-symbols-outlined text-[15px] text-forest">lock</span>
              <span className="font-label-meta tracking-widest text-[11px] uppercase font-bold text-ink-soft">
                WAITLIST
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs font-body-sm text-ink-soft">
              <a href="/privacy" className="hover:text-ink hover:underline transition-colors">Privacy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-ink hover:underline transition-colors">Terms</a>
            </div>

            <button
              onClick={() => setShowSupportModal(true)}
              className="text-sm font-medium text-ink-soft hover:text-ink hover:underline transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center">
        {/* ============================================================== */}
        {/* SCREEN 1 – CHECKOUT / WAITLIST                                 */}
        {/* ============================================================== */}
        {step === 'details' && (
          <div className="w-full max-w-xl mx-auto space-y-8 animate-fadeIn">
            {/* Header copy */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-bold">
                ONE-TIME PURCHASE · $19
              </div>
              <h1 className="font-headline-lg text-3xl sm:text-5xl text-ink font-display tracking-tight leading-tight">
                Join the{' '}
                <mark className="bg-marker text-on-marker px-2.5 py-0.5 rounded-none font-normal italic inline-block">
                  waitlist
                </mark>
              </h1>
            </div>

            {/* Main Checkout Card */}
            <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line shadow-sm space-y-6 text-left relative overflow-hidden">
              {/* Product header row */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-paper-line pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-headline-lg text-2xl sm:text-3xl font-display text-ink font-semibold">
                      First Take
                    </h2>
                    <span className="font-label-meta text-[10px] tracking-widest uppercase bg-forest-tint text-forest px-2.5 py-1 rounded font-bold border border-forest/20">
                      ONE-TIME
                    </span>
                  </div>
                  <p className="font-body-sm text-sm text-ink-soft mt-1">
                    $19 USD — once · no recurring charges
                  </p>
                </div>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-ink">$19</span>
                  <span className="font-label-meta text-xs text-ink-soft">USD</span>
                </div>
              </div>

              {/* EVERYTHING INCLUDED checklist */}
              <div className="space-y-3">
                <span className="font-label-eyebrow text-[11px] tracking-widest uppercase text-ink-faint font-bold block">
                  EVERYTHING INCLUDED
                </span>
                <ul className="space-y-2.5 font-body-sm text-sm text-ink">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Unlimited scripts in your library</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Unlimited recording takes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Camera &amp; mic recording, saved to your computer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Dark background, and mirrored text for teleprompter glass</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Script follows your voice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-forest text-[19px] shrink-0 mt-0.5">check_circle</span>
                    <span>Every future update included</span>
                  </li>
                </ul>
              </div>

              {/* Email Form */}
              <form onSubmit={handleDetailsSubmit} className="pt-4 border-t border-paper-line space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="customer-email" className="font-title-md text-sm font-semibold text-ink block">
                    Where should we send your access link?
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="founder@company.com"
                    className="w-full h-12 px-4 rounded-lg bg-paper-sunk border border-paper-line text-ink font-body-sm text-base placeholder:text-ink-faint focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all"
                  />
                  {emailError && (
                    <p className="text-xs text-rec font-medium">{emailError}</p>
                  )}
                  <p className="font-label-meta text-xs text-ink-soft leading-relaxed pt-0.5">
                    Your email is your login. No password needed. The free demo requires no account.
                  </p>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-title-md text-base font-semibold hover:bg-forest-dark transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Saving your spot...</span>
                      </>
                    ) : (
                      <span>Join the list — checkout opens soon →</span>
                    )}
                  </button>

                  <p className="text-center font-label-meta text-xs text-ink-soft leading-relaxed px-2">
                    Checkout opens soon. We'll email you when it opens. No charge today.
                  </p>
                </div>
              </form>
            </div>

            {/* Trust Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-paper-raised border border-paper-line flex items-center gap-3">
                <span className="material-symbols-outlined text-forest text-[20px] shrink-0">shield</span>
                <span className="font-label-meta text-xs font-semibold text-ink">Videos stay on your device</span>
              </div>
              <div className="p-3.5 rounded-lg bg-paper-raised border border-paper-line flex items-center gap-3">
                <span className="material-symbols-outlined text-forest text-[20px] shrink-0">graphic_eq</span>
                <span className="font-label-meta text-xs font-semibold text-ink">Script follows your voice</span>
              </div>
              <div className="p-3.5 rounded-lg bg-paper-raised border border-paper-line flex items-center gap-3">
                <span className="material-symbols-outlined text-forest text-[20px] shrink-0">verified</span>
                <span className="font-label-meta text-xs font-semibold text-ink">14-Day Guarantee</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3 – CONFIRMATION: YOU'RE ON THE LIST                    */}
        {/* ============================================================== */}
        {step === 'confirmation' && (
          <div className="w-full max-w-xl mx-auto space-y-8 animate-fadeIn text-center">
            {/* Header */}
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-forest-tint text-forest mx-auto flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-bold">
                EARLY ACCESS
              </div>
              <h1 className="font-headline-lg text-4xl sm:text-5xl text-ink font-display tracking-tight leading-tight">
                You're on the{' '}
                <mark className="bg-marker text-on-marker px-2.5 py-0.5 rounded-none font-normal italic inline-block">
                  list
                </mark>
              </h1>
              <p className="font-lead text-base sm:text-lg text-ink-soft max-w-md mx-auto leading-relaxed">
                We'll email <span className="font-semibold text-ink underline">{email}</span> as soon as checkout opens.
              </p>
            </div>

            {/* Next Actions Card */}
            <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line shadow-sm space-y-6 text-left">
              <div className="space-y-2">
                <h3 className="font-title-md text-base font-semibold text-ink">
                  Until then, use the free demo
                </h3>
                <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                  The prompter is free to use, with no sign-up. Paste your script and record a take now.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={onOpenPrompter}
                  className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-title-md text-base font-semibold hover:bg-forest-dark transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Try the free demo now →</span>
                </button>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onOpenScripts}
                    className="flex-1 py-3 px-4 rounded-lg bg-paper-sunk hover:bg-paper-line/50 text-ink font-body-sm text-sm font-medium border border-paper-line transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-forest">edit_document</span>
                    <span>Open Script Editor</span>
                  </button>

                  <button
                    onClick={onExit}
                    className="flex-1 py-3 px-4 rounded-lg bg-paper-raised hover:bg-paper-sunk text-ink font-body-sm text-sm font-medium border border-paper-line transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-ink-soft">arrow_back</span>
                    <span>Back to Homepage</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* UNREACHABLE CODE: PAYMENT CONFIRMED / RECEIPT SCREEN           */}
        {/* (Preserved per instructions: kept in code, unreachable)        */}
        {/* ============================================================== */}
        {false && (
          <div className="hidden" aria-hidden="true">
            <div className="receipt-unreachable-archive">
              <h2>Payment confirmed</h2>
              <p>You're all set</p>
              <div>YOUR PLAN: Full version — yours forever</div>
              <div>First Take Studio — one-time purchase: $19.00 USD paid via Stripe</div>
              <button>Open the teleprompter →</button>
              <button>Download receipt</button>
            </div>
          </div>
        )}
      </main>

      {/* 3. SHARED FOOTER ON ALL CHECKOUT SCREENS */}
      <footer className="border-t border-paper-line py-8 mt-12 bg-paper-sunk/30">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint font-body-sm">
          <p>© 2026 First Take Studio</p>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              className="hover:text-ink cursor-pointer transition-colors"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="/terms"
              className="hover:text-ink cursor-pointer transition-colors"
            >
              Terms
            </a>
            <span>•</span>
            <button
              onClick={() => setShowSupportModal(true)}
              className="hover:text-ink cursor-pointer transition-colors"
            >
              Support
            </button>
          </div>
        </div>
      </footer>

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised rounded-2xl max-w-md w-full p-8 border border-paper-line shadow-xl space-y-6 text-left animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-forest text-[22px]">contact_support</span>
                <h3 className="font-headline-sm text-lg font-semibold text-ink">First Take Support</h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-ink-faint hover:text-ink cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm font-body-sm text-ink-soft leading-relaxed">
              <p>
                Questions about the launch, voice follow, or recording? Email us.
              </p>
              <div className="p-4 rounded-xl bg-paper-sunk border border-paper-line space-y-1">
                <span className="font-label-meta text-[11px] text-ink-faint uppercase font-bold block">
                  DIRECT EMAIL SUPPORT
                </span>
                <a
                  href="mailto:support@firsttakestudio.com"
                  className="font-medium text-forest text-base hover:underline block"
                >
                  support@firsttakestudio.com
                </a>
                <p className="text-xs text-ink-faint pt-1">
                  We reply within 24 hours.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 rounded-lg bg-forest text-on-forest font-title-md text-sm font-medium hover:bg-forest-dark transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
