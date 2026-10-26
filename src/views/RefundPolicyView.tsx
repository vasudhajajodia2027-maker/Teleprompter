import React, { useEffect } from 'react';
import type { AppView } from '../App';
import { SUPPORT_EMAIL } from '../lib/contact';

interface RefundPolicyViewProps {
  onNavigate: (view: AppView) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3 py-8 border-b border-paper-line last:border-b-0">
    <h2 className="font-display text-2xl text-ink font-medium">{title}</h2>
    <div className="font-body-md text-base text-ink-soft leading-relaxed space-y-3">{children}</div>
  </section>
);

export const RefundPolicyView: React.FC<RefundPolicyViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = 'Refunds & Cancellation — First Take';
  }, []);

  const mail = (
    <a href={`mailto:${SUPPORT_EMAIL}?subject=Refund%20request`} className="text-forest font-medium underline hover:text-forest-dark">
      {SUPPORT_EMAIL}
    </a>
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-6 lg:px-12 py-12 text-ink">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => onNavigate('overview')}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink font-body-sm text-sm transition-colors cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Home</span>
        </button>
        <span className="font-label-meta text-xs text-ink-faint">Effective: 26 October 2026</span>
      </div>

      <header className="space-y-4 pb-8 border-b border-paper-line">
        <h1 className="font-display text-4xl sm:text-5xl text-ink font-normal leading-tight">
          Refunds &amp; <span className="marker-stroke italic">cancellation</span>
        </h1>
        <p className="font-body-md text-lg text-ink-soft leading-relaxed">
          First Take is a one-time purchase with a 14-day money-back guarantee. There is no subscription, so there is
          nothing to cancel later.
        </p>
      </header>

      <div className="my-8 p-6 rounded-2xl bg-marker-soft border border-marker-border/40">
        <h2 className="font-title-md text-base font-semibold text-ink">In short</h2>
        <ul className="mt-3 space-y-2 font-body-sm text-sm text-ink leading-relaxed list-disc pl-5">
          <li>Ask within 14 days of buying and you get your money back in full. No questions asked.</li>
          <li>Email {mail} from the address you bought with, or include your payment ID.</li>
          <li>The refund goes back to the card or account you paid with.</li>
        </ul>
      </div>

      <Section title="The 14-day guarantee">
        <p>
          If First Take doesn't suit you for any reason, ask for a refund within 14 days of your purchase date and we
          refund the full amount you paid. You don't need to give a reason.
        </p>
        <p>After 14 days, purchases are final, except where the law where you live gives you a longer right to a refund.</p>
      </Section>

      <Section title="How to ask for a refund">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Email {mail} with the subject &ldquo;Refund request&rdquo;.
          </li>
          <li>
            Send it from the email address on your receipt, or include the payment ID from the receipt so we can find
            your purchase.
          </li>
          <li>We reply within 24 hours and confirm when the refund has been issued.</li>
        </ol>
      </Section>

      <Section title="When the money arrives">
        <p>
          Payments are handled by Dodo Payments, our payment provider and merchant of record, so the refund is issued
          through them to the card or account you paid with. Once it is issued, your bank decides how long it takes
          to show up. This is usually a few business days.
        </p>
      </Section>

      <Section title="What happens to your account">
        <p>
          When a full refund is issued, the paid license on your account is switched off and the app goes back to the
          free demo. Your scripts stay in your browser and your downloaded videos stay on your computer. Nothing you
          made is deleted.
        </p>
      </Section>

      <Section title="Cancellation">
        <p>
          First Take is paid once. There are no renewals or recurring charges, so there is no subscription to cancel. If
          you no longer want it, stop using it, or ask for a refund within 14 days.
        </p>
      </Section>

      <Section title="Payment problems">
        <p>
          If a payment failed, you were not charged. If you were charged twice or see a charge you don't recognise,
          email {mail} and we will sort it out.
        </p>
      </Section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate('contact')}
          className="px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer"
        >
          Contact us
        </button>
        <button
          onClick={() => onNavigate('terms')}
          className="px-5 py-2.5 rounded-lg bg-paper-raised border border-paper-line text-ink font-body-sm text-sm font-medium hover:bg-paper-sunk transition-colors cursor-pointer"
        >
          Terms of Service
        </button>
      </div>
    </div>
  );
};
