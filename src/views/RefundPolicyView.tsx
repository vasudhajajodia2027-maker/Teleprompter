import React, { useEffect } from 'react';
import type { AppView } from '../App';
import { SUPPORT_EMAIL } from '../lib/contact';
import { PAYMENTS_ENABLED } from '../lib/payments';

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
    document.title = 'Refund Policy — First Take';
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
          Refund <span className="marker-stroke italic">policy</span>
        </h1>
        <p className="font-body-md text-lg text-ink-soft leading-relaxed">
          You pay once for First Take, and you can get all of it back within 14 days.
        </p>
        {!PAYMENTS_ENABLED && (
          <p className="font-body-sm text-sm text-ink-soft">
            Buying hasn't opened yet. This is the policy that will apply to every purchase.
          </p>
        )}
      </header>

      <Section title="14-day money-back guarantee">
        <p>
          If First Take isn't right for you, ask within 14 days of buying and we refund the full amount. You don't need
          to give a reason. First Take is a one-time purchase with no subscription, so nothing renews and there is
          nothing to cancel.
        </p>
      </Section>

      <Section title="How to get a refund">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Email {mail} with the subject &ldquo;Refund request&rdquo;, from the address on your receipt (or include
            the payment ID from the receipt).
          </li>
          <li>We reply within 24 hours and issue the refund through Dodo Payments, who process our payments.</li>
          <li>
            The money goes back to the card or account you paid with. Your bank decides how long it takes to show up,
            usually a few business days.
          </li>
        </ol>
        <p>
          After the refund, your account goes back to the free demo. Your scripts and the videos you downloaded are not
          affected.
        </p>
      </Section>

      <Section title="After 14 days">
        <p>
          Purchases are final after 14 days, unless the law where you live gives you a longer right to a refund.
        </p>
      </Section>

      <Section title="A charge you don't recognise">
        <p>
          If you were charged twice, or see a First Take charge you didn't make, email {mail} and we will refund it.
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
