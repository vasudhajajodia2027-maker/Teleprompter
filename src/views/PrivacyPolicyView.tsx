import React, { useEffect } from 'react';

interface PrivacyPolicyViewProps {
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms') => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Privacy Policy — First Take Studio';
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 lg:px-12 py-12 text-ink selection:bg-marker selection:text-ink">
      {/* Breadcrumb / Back Link */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => onNavigate('overview')}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink font-label-meta text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Home</span>
        </button>

        <span className="font-label-meta text-xs text-ink-faint">
          Effective: 15 October 2026
        </span>
      </div>

      {/* Hero Header */}
      <header className="space-y-4 pb-8 border-b border-paper-line">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
          LEGAL &amp; PRIVACY
        </div>

        <h1 className="font-headline-lg font-display text-3xl sm:text-5xl text-ink font-semibold tracking-tight leading-tight">
          Privacy Policy for{' '}
          <mark className="bg-marker text-on-marker px-2 py-0.5 rounded-none font-normal italic inline-block">
            First Take
          </mark>
        </h1>

        <p className="font-body-md text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl">
          We designed First Take Studio around a simple, unbreakable premise: your voice, your face, and your creative recordings belong entirely to you on your device.
        </p>
      </header>

      {/* Plain English Summary Callout */}
      <div className="my-8 p-6 sm:p-7 rounded-2xl bg-forest-tint/60 border border-forest/20 space-y-3">
        <div className="flex items-center gap-2 text-forest font-label-eyebrow text-xs uppercase tracking-wider font-bold">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span>Summary in Plain English</span>
        </div>
        <ul className="space-y-2 font-body-sm text-sm text-ink-soft leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>Zero Audio or Video Uploads:</strong> Camera and microphone streams are processed 100% locally in your browser memory. Recordings never touch our servers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>Free Demo:</strong> Requires no account. All sample scripts stay exclusively in your browser&apos;s local storage.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-forest font-bold">•</span>
            <span><strong>No Ad Tracking or Data Selling:</strong> We never sell your personal information or use your data for targeted advertising.</span>
          </li>
        </ul>
      </div>

      {/* Main Legal Sections */}
      <div className="space-y-10 py-6">
        {/* Section 1 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 01
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Who We Are
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              First Take Studio (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides a speech-responsive teleprompter application accessible via the web. Our mission is to help founders, educators, and creators deliver presentations with natural, unhurried presence.
            </p>
            <p>
              For any questions regarding this policy or your personal data, you can reach our operator directly at{' '}
              <a
                href="mailto:vasudhajajo@gmail.com"
                className="text-forest font-medium underline hover:text-forest-dark"
              >
                vasudhajajo@gmail.com
              </a>.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 02
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            What We Collect &amp; How It Is Used
          </h2>
          <div className="font-body-sm text-ink-soft space-y-4 text-base leading-relaxed">
            <div>
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                A. Waitlist Submissions
              </h3>
              <p>
                When you submit your email address on our checkout or waitlist screen, we collect and store your email address solely to notify you when First Take purchases and new releases become available. We do not use this email address for unrelated marketing.
              </p>
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                B. Google Account Information (When Signed In)
              </h3>
              <p>
                If you choose to sign in using your Google account, we receive your name, email address, and profile avatar URL directly from Google via our authentication provider. We use this information solely to identify your account and sync your saved scripts across your devices.
              </p>
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                C. User Scripts &amp; Notes
              </h3>
              <p>
                When signed in, scripts you create or edit in your library are saved to your secure cloud database account so you can access them across sessions. If you are signed out or using the free demo, all scripts remain strictly inside your browser&apos;s local storage (<code className="px-1.5 py-0.5 rounded bg-paper-sunk font-label-meta text-xs text-ink">localStorage</code>) and are never transmitted to any server.
              </p>
            </div>

            <div className="pt-2 border-t border-paper-line/50">
              <h3 className="font-title-md font-semibold text-ink text-base mb-1">
                D. Camera &amp; Microphone Streams (Processed 100% Locally)
              </h3>
              <p>
                When you use the teleprompter with speech follow or video preview, your camera and microphone audio are captured and processed purely in local browser memory using the Web Speech API and MediaStream API. <strong>Your camera video and microphone audio are never recorded by us, never transmitted over the network, and never stored on our servers.</strong> Video exports are rendered locally in your browser and downloaded directly to your computer.
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
            Service Providers
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              We rely on trusted third-party infrastructure providers to run First Take Studio:
            </p>
            <ul className="space-y-2 list-disc list-inside pl-2">
              <li>
                <strong className="text-ink">Supabase:</strong> Provides our managed PostgreSQL database and authentication infrastructure. User accounts and synced scripts are stored securely with Row Level Security (RLS) enabled.
              </li>
              <li>
                <strong className="text-ink">Google Identity Services:</strong> Provides secure single sign-on (OAuth) when you choose to log in with your Google account.
              </li>
            </ul>
            <p>
              These providers process data only as necessary to deliver their respective services and are bound by strict data protection agreements.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 04
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            We Do Not Sell or Monetize Personal Data
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              We do not sell, rent, license, or monetize your personal information to third parties. We do not use your scripts, recordings, email address, or identity for advertising, audience profiling, or behavioral tracking.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 05
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Payments &amp; Financial Information
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              Paid checkout is not currently live (we are currently operating in a waitlist phase). When payment functionality opens for the $19 one-time license, all transactions will be processed directly through Stripe, a PCI-DSS Level 1 certified payment processor.
            </p>
            <p>
              First Take Studio will never receive, store, or process your credit card numbers, CVV codes, or bank credentials. All financial information is handled entirely within Stripe&apos;s encrypted payment infrastructure.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 06
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Data Retention &amp; Your Right to Deletion
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              We retain your account information and synced scripts only for as long as your account remains active. Waitlist emails are kept until the product launch or until you request removal.
            </p>
            <p>
              You have the right to request access to the personal data we hold about you, or to request complete deletion of your account, scripts, and email from our systems. To submit a deletion or access request, email us at{' '}
              <a
                href="mailto:vasudhajajo@gmail.com"
                className="text-forest font-medium underline hover:text-forest-dark"
              >
                vasudhajajo@gmail.com
              </a>. Requests are processed promptly within 30 days.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 07
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Children&apos;s Privacy
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              First Take Studio is a professional productivity tool and is not directed at children under the age of 13. We do not knowingly collect or solicit personal information from children under 13. If we discover that personal information from a child under 13 has been collected, we will delete that information immediately.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 08
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Changes to This Policy
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our legal obligations, features, or operational practices. When updates are published, we will revise the &ldquo;Effective Date&rdquo; at the top of this document. Continued use of First Take Studio after updates are posted signifies your acknowledgement of the revised terms.
            </p>
          </div>
        </section>

        {/* Section 9 */}
        <section className="p-8 sm:p-10 rounded-2xl bg-paper-raised border border-paper-line space-y-4">
          <div className="font-label-meta text-xs text-forest uppercase tracking-widest font-bold">
            SECTION 09
          </div>
          <h2 className="font-headline-md font-display text-2xl text-ink font-semibold">
            Contact Us
          </h2>
          <div className="font-body-sm text-ink-soft space-y-3 text-base leading-relaxed">
            <p>
              If you have any questions, comments, or privacy-related requests, please contact our team directly:
            </p>
            <div className="p-4 rounded-xl bg-paper-sunk border border-paper-line">
              <p className="font-semibold text-ink">First Take Studio</p>
              <p className="text-ink-soft">Attn: Privacy &amp; Data Protection</p>
              <p className="pt-1">
                Email:{' '}
                <a
                  href="mailto:vasudhajajo@gmail.com"
                  className="text-forest font-semibold underline hover:text-forest-dark"
                >
                  vasudhajajo@gmail.com
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
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('terms');
            }}
            className="hover:text-ink underline transition-colors cursor-pointer"
          >
            Read Terms of Service →
          </a>
        </div>
      </div>
    </div>
  );
};
