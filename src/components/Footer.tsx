import React from 'react';
import { BrandLogo } from './BrandLogo';
import { OPEN_CONSENT_EVENT } from './ConsentBanner';

interface FooterProps {
  onNavigate?: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms' | 'refunds' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, view: 'privacy' | 'terms' | 'refunds' | 'contact') => {
    // If not middle-clicked, Ctrl/Cmd-clicked, let client-side router handle smooth transition
    if (onNavigate && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      onNavigate(view);
    }
  };

  return (
    <footer className="w-full bg-paper-sunk py-12 border-t border-paper-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showSubtitle={false} />
          <span className="font-label-meta text-xs text-ink-soft">
            A teleprompter that follows your voice
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, 'contact')}
            className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Contact
          </a>
          <a
            href="/refunds"
            onClick={(e) => handleLinkClick(e, 'refunds')}
            className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Refund policy
          </a>
          <a
            href="/privacy"
            onClick={(e) => handleLinkClick(e, 'privacy')}
            className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Privacy
          </a>
          <a
            href="/terms"
            onClick={(e) => handleLinkClick(e, 'terms')}
            className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Terms
          </a>
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
            className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Cookie settings
          </button>
        </div>

        <p className="font-label-meta text-xs text-ink-faint">
          © 2026 First Take
        </p>
      </div>
    </footer>
  );
};
