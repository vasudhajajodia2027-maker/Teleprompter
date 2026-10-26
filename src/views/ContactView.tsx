import React, { useEffect } from 'react';
import type { AppView } from '../App';
import { SUPPORT_EMAIL } from '../lib/contact';

interface ContactViewProps {
  onNavigate: (view: AppView) => void;
}

const topics = [
  { icon: 'receipt_long', title: 'Payments and refunds', body: 'Include the payment ID from your receipt, or write from the email you bought with.', subject: 'Payment question' },
  { icon: 'graphic_eq', title: 'Voice follow and recording', body: 'Tell us your browser and what happened. A screenshot helps.', subject: 'Help with First Take' },
  { icon: 'lightbulb', title: 'Ideas and feedback', body: 'What would make First Take more useful to you?', subject: 'Feedback' },
];

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = 'Contact — First Take';
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-6 lg:px-12 py-12 text-ink">
      <button
        onClick={() => onNavigate('overview')}
        className="mb-8 inline-flex items-center gap-2 text-ink-soft hover:text-ink font-body-sm text-sm transition-colors cursor-pointer"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>Home</span>
      </button>

      <header className="space-y-4 pb-8">
        <h1 className="font-display text-4xl sm:text-5xl text-ink font-normal leading-tight">
          Get in <span className="marker-stroke italic">touch</span>
        </h1>
        <p className="font-body-md text-lg text-ink-soft leading-relaxed">
          Email is the quickest way to reach us. We reply within 24 hours.
        </p>
      </header>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="group flex items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-paper-raised border-2 border-forest shadow-sm hover:shadow-md transition-shadow"
      >
        <div>
          <p className="font-body-sm text-sm text-ink-soft">Email</p>
          <p className="font-display text-2xl sm:text-3xl text-ink break-all">{SUPPORT_EMAIL}</p>
        </div>
        <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-forest group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </a>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {topics.map((t) => (
          <a
            key={t.title}
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.subject)}`}
            className="p-5 rounded-xl bg-paper-raised border border-paper-line hover:border-forest/40 transition-colors space-y-2"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-forest">{t.icon}</span>
            <h2 className="font-title-md text-base font-semibold text-ink">{t.title}</h2>
            <p className="font-body-sm text-sm text-ink-soft leading-relaxed">{t.body}</p>
          </a>
        ))}
      </div>

      <div className="mt-10 p-6 rounded-xl bg-paper-sunk border border-paper-line font-body-sm text-sm text-ink-soft leading-relaxed space-y-2">
        <p>
          Looking for a refund? See the{' '}
          <button onClick={() => onNavigate('refunds')} className="text-forest font-medium underline cursor-pointer">
            refund policy
          </button>
          : every purchase has a 14-day money-back guarantee.
        </p>
        <p>Payments are processed by Dodo Payments, who also send your receipt by email.</p>
      </div>
    </div>
  );
};
