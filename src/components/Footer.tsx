import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigate?: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, view: 'privacy' | 'terms') => {
    // If not middle-clicked, Ctrl/Cmd-clicked, let client-side router handle smooth transition
    if (onNavigate && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      onNavigate(view);
    }
  };

  return (
    <>
      <footer className="w-full bg-paper-sunk py-12 border-t border-paper-line">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showSubtitle={false} />
            <span className="font-label-meta text-xs text-ink-soft">
              Speech-responsive teleprompter for founders
            </span>
          </div>

          <div className="flex items-center gap-6">
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
              onClick={() => setShowShortcutsModal(true)}
              className="font-body-sm text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              Keyboard Shortcuts
            </button>
          </div>

          <p className="font-label-meta text-xs text-ink-faint">
            © 2026 First Take Studio · Crafted for natural speaking rhythm.
          </p>
        </div>
      </footer>

      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-paper-raised rounded-xl max-w-md w-full p-6 shadow-2xl border border-paper-line">
            <div className="flex items-center justify-between pb-4 border-b border-paper-line">
              <h3 className="font-headline-sm text-lg font-semibold text-ink">Keyboard Shortcuts</h3>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="text-ink-soft hover:text-ink p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="py-4 space-y-3 font-body-sm text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Pause / Resume Teleprompter</span>
                <kbd className="px-2 py-1 rounded bg-paper-sunk font-label-meta text-xs font-semibold text-ink border border-paper-line">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Stop &amp; Finish Recording Take</span>
                <kbd className="px-2 py-1 rounded bg-paper-sunk font-label-meta text-xs font-semibold text-ink border border-paper-line">R</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Exit Studio Window</span>
                <kbd className="px-2 py-1 rounded bg-paper-sunk font-label-meta text-xs font-semibold text-ink border border-paper-line">Esc</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Duplicate Script</span>
                <kbd className="px-2 py-1 rounded bg-paper-sunk font-label-meta text-xs font-semibold text-ink border border-paper-line">Cmd + D</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Jump to Line</span>
                <span className="font-label-meta text-xs text-ink-faint">Click any line</span>
              </div>
            </div>
            <div className="pt-3 border-t border-paper-line text-right">
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-forest text-on-forest rounded-lg font-body-sm text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
