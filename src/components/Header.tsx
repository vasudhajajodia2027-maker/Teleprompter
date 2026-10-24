import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

// On the home page the hero already has a big "Try it free" button; the header
// one appears only once that has scrolled out of view, so the two never sit
// on screen together.
function useHeroCtaVisible(active: boolean): boolean {
  const [visible, setVisible] = useState(active);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    // Looked up on every check: the hero can re-render into a new element.
    // The fixed header covers the top 64px, so the button counts as gone once it slides under it.
    const check = () => {
      const hero = document.getElementById('hero-cta');
      if (!hero) return setVisible(false);
      const r = hero.getBoundingClientRect();
      setVisible(r.bottom > 64 && r.top < window.innerHeight);
    };
    const frame = requestAnimationFrame(check);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [active]);
  return visible;
}

interface HeaderProps {
  currentView: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms';
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms') => void;
  isPro?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, isPro }) => {
  const heroCtaVisible = useHeroCtaVisible(currentView === 'overview');
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-paper/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-paper-line/50">
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
        {/* Brand Zone */}
        <button 
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
        >
          <BrandLogo size="md" showSubtitle={false} />
          {isPro && (
            <span className="font-label-meta text-[11px] bg-forest-tint text-forest px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              PRO
            </span>
          )}
        </button>

        {/* Navigation Zone */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigate('overview')}
            className={`font-body-sm text-sm transition-colors cursor-pointer ${
              currentView === 'overview'
                ? 'text-primary font-title-md font-semibold'
                : 'text-on-surface-variant hover:text-ink'
            }`}
          >
            How it works
          </button>
          <button
            onClick={() => {
              if (currentView === 'overview') {
                const el = document.getElementById('pricing');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                  return;
                }
              }
              onNavigate('pricing');
            }}
            className={`font-body-sm text-sm transition-colors cursor-pointer ${
              currentView === 'pricing'
                ? 'text-primary font-title-md font-semibold'
                : 'text-on-surface-variant hover:text-ink'
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => onNavigate('pricing')}
            className="font-body-sm text-sm text-on-surface-variant hover:text-ink transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Action Zone */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('prompter')}
            aria-hidden={heroCtaVisible}
            tabIndex={heroCtaVisible ? -1 : 0}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-forest text-on-forest font-body-sm text-sm hover:bg-forest-dark transition-all duration-200 shadow-sm cursor-pointer active:scale-95 ${
              heroCtaVisible ? 'opacity-0 translate-y-1 pointer-events-none' : 'opacity-100'
            }`}
          >
            Try it free
          </button>
        </div>
      </div>
    </header>
  );
};

