import React, { useEffect } from 'react';
import { SUPPORT_EMAIL } from '../lib/contact';
import { PAYMENTS_ENABLED } from '../lib/payments';

interface TermsOfServiceViewProps {
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms' | 'refunds' | 'contact') => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Terms of Service — First Take';
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 lg:px-12 py-12 text-ink selection:bg-marker selection:text-ink">
      {/* Breadcrumb / Back Link */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => onNavigate('overview')}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink font-label-meta text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Home</span>
        </button>

        <span className="font-label-meta text-xs text-ink-faint">
          Effective: 17 October 2026
        </span>
      </div>

      {/* Hero Header */}
      <header className="space-y-4 pb-8 border-b border-paper-line">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
          LEGAL &amp; TERMS
        </div>

        <h1 className="font-headline-lg font-display text-3xl sm:text-5xl text-ink font-semibold tracking-tight leading-tight">
          Terms of Service for{' '}
          <mark className="marker-stroke bg-transparent text-ink italic">
            First Take
          </mark>
        </h1>

        <p className="font-body-md text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl">
          The terms for using First Take. The main points are below.
        </p>
      </header>

      {/* Highlights Box */}
      <div className="my-8 p-6 sm:p-7 rounded-2xl bg-paper-sunk/70 border border-paper-line space-y-3">
        <div className="flex items-center gap-2 text-forest font-label-eyebrow text-xs uppercase tracking-wider font-bold">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">gavel</span>
          <span>Key Summary</span>
        </div>
        <ul className="space-y-2 font-body-sm text-sm text-ink-soft leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>You own your content:</strong> All scripts, video recordings, audio takes, and intellectual property remain entirely yours.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>No recurring fees:</strong> {PAYMENTS_ENABLED ? 'There is a free demo, and a one-time license at an early price of ₹199 / $2.' : 'There is a free demo now, and a one-time license at an early price of ₹199 / $2 is planned.'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>14-day money-back guarantee:</strong> {PAYMENTS_ENABLED ? 'Every' : 'Once paid checkout opens, every'} purchase includes a full 14-day refund window. See the <a href="/refunds" className="text-forest underline">refund policy</a>.</span>
          </li>
        </ul>
      </div>

      {/* Main Sections */}
      <div className="space-y-10 py-6">
        {/* Section 1 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 01
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Acceptance of Terms
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              By accessing, browsing, or using the First Take website, web application, teleprompter engine, or any related services (&ldquo;the Service&rdquo;), you confirm that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <p>
              If you do not agree to these Terms, you must immediately discontinue use of the Service.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 02
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            The Free Demo &amp; Planned One-Time Purchase
          </h2>
          <div className="font-body-sm text-ink-soft space-y-4 text-base leading-relaxed">
            <div>
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                A. The Free Demo
              </h3>
              <p>
                We provide a free demo version of First Take that requires no account, credit card, or payment information. In the free demo, you can use the speech-responsive teleprompter, create scripts, record takes on up to 10 different scripts, and download up to 3 videos. These limits are counted in your browser; deleting a script does not restore its slot. Data in the free demo is stored solely within your local browser storage.
              </p>
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                B. The Lifetime License
              </h3>
              <p>
                {PAYMENTS_ENABLED ? 'We offer' : 'We plan to offer'} a single, one-time lifetime license at an early price of ₹199 (in India) or US$2 (elsewhere). This purchase grants permanent access to First Take for personal and commercial content creation, including recording on unlimited scripts, unlimited video takes and downloads, camera and microphone export, optical mirror mode, and all future updates with no recurring subscription fees.
              </p>
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                {PAYMENTS_ENABLED ? 'C. Payments' : 'C. Current Waitlist Status'}
              </h3>
              {PAYMENTS_ENABLED ? (
                <p>
                  Payments are processed by Dodo Payments, who act as the merchant of record and send your receipt. Your license is linked to the Google account you sign in with when you buy. Refunds follow our{' '}
                  <a href="/refunds" className="text-forest font-medium underline hover:text-forest-dark">refund policy</a>.
                </p>
              ) : (
                <p>
                  <strong>Checkout is not live yet.</strong> Submitting your email on our checkout page joins the waitlist. You are not charged, and no payment method is collected. We will notify waitlist members by email as soon as checkout becomes active.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                D. 14-Day Money-Back Guarantee
              </h3>
              <p>
                {PAYMENTS_ENABLED ? 'Every' : 'Once one-time purchases open, every'} license purchase comes with a 14-day money-back guarantee. If First Take does not fit your speaking workflow for any reason within 14 days of your purchase date, email us at{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-forest font-medium underline hover:text-forest-dark"
                >
                  {SUPPORT_EMAIL}
                </a>{' '}
                for a full, unconditional refund.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 03
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Acceptable Use
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              You agree to use First Take solely for lawful personal or commercial purposes. You agree not to:
            </p>
            <ul className="space-y-2 list-disc list-inside pl-2">
              <li>Disrupt, overload, or compromise the technical infrastructure of the application.</li>
              <li>Attempt to bypass authentication mechanisms or access other users&apos; accounts or scripts.</li>
              <li>Redistribute, sublicense, reverse-engineer, decompile, or resell the core teleprompter software source code.</li>
              <li>Use the software to create, broadcast, or transmit content that is defamatory, unlawful, obscene, or infringing on the intellectual property of others.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 04
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            User Ownership of Content &amp; Recordings
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              <strong>You own everything you create.</strong> You retain complete, exclusive ownership and all copyrights to all script manuscripts, speech notes, video takes, and audio recordings created with or uploaded into First Take.
            </p>
            <p>
              First Take does not claim any intellectual property rights, licenses, or ownership in your materials, and will never use your speeches, scripts, or video takes for promotional or AI training purposes.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 05
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            &ldquo;As-Is&rdquo; Provision &amp; Disclaimer of Warranties
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              First Take is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis, without warranties of any kind, whether express, statutory, or implied.
            </p>
            <p>
              To the fullest extent permissible under applicable law, First Take disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or that the application will be uninterrupted, error-free, or compatible with every browser or hardware microphone configuration.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 06
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Limitation of Liability
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              To the maximum extent permitted by applicable law, in no event shall First Take, its developers, or its affiliates be liable for any indirect, incidental, special, exemplary, consequential, or punitive damages, or for any loss of profits, revenue, data, goodwill, or recording takes arising out of or in connection with your use or inability to use the Service.
            </p>
            <p>
              In all circumstances, our maximum aggregate liability to you for any claim arising out of these Terms or your use of the Service shall not exceed the amount actually paid by you to First Take in the twelve (12) months preceding the event giving rise to liability (or US$2, whichever is greater).
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 07
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Updates to These Terms
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              We reserve the right to revise or update these Terms of Service at our discretion. Any modifications will become effective immediately upon posting to this URL, indicated by the &ldquo;Effective Date&rdquo; header. Your continued use of First Take following any revisions constitutes your acceptance of the updated Terms.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 08
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Contact Information
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              If you have any questions or concerns regarding these Terms of Service, please write to us at:
            </p>
            <div className="p-4 rounded-xl bg-paper-sunk border border-paper-line">
              <p className="font-semibold text-ink">First Take</p>
              <p className="text-ink-soft">Attn: Legal &amp; Operations</p>
              <p className="pt-1">
                Email:{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-forest font-semibold underline hover:text-forest-dark"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Navigation Bar */}
      <div className="mt-12 pt-8 border-t border-paper-line flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('overview')}
          className="px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all cursor-pointer"
        >
          Return to Studio
        </button>

        <div className="flex items-center gap-4 text-xs font-label-meta text-ink-soft">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('privacy');
            }}
            className="hover:text-ink underline transition-colors cursor-pointer"
          >
            ← Read Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};
