import React from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms' | 'refunds' | 'contact';
  activeSection?: 'scripts' | 'prompter';
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms' | 'refunds' | 'contact') => void;
  onNewScript: () => void;
  onSelectSection?: (section: 'scripts' | 'prompter') => void;
  // Below md the sidebar is a drawer: hidden unless open, closed by onClose.
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeSection = 'scripts',
  onNavigate,
  onNewScript,
  onSelectSection,
  open = false,
  onClose,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const handleNav = (target: 'scripts' | 'prompter') => {
    if (onSelectSection) onSelectSection(target);
    if (target === 'scripts') onNavigate('scripts');
    else if (target === 'prompter') onNavigate('prompter');
    onClose?.();
  };

  return (
    <>
    {open && (
      <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true"></div>
    )}
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-paper-sunk z-50 flex flex-col justify-between p-6 border-r border-paper-line transition-transform duration-200 md:translate-x-0 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <button
          onClick={() => {
            onNavigate('overview');
            onClose?.();
          }}
          className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group"
        >
          <BrandLogo size="sm" showSubtitle={false} />
        </button>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => handleNav('scripts')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeSection === 'scripts' && (currentView === 'scripts' || currentView === 'editor')
                ? 'bg-paper-raised text-forest font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                : 'font-body-sm text-sm text-on-surface-variant hover:bg-paper-raised hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">description</span>
            <span>My Scripts</span>
          </button>

          <button
            onClick={() => handleNav('prompter')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              currentView === 'prompter'
                ? 'bg-paper-raised text-forest font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                : 'font-body-sm text-sm text-on-surface-variant hover:bg-paper-raised hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">record_voice_over</span>
            <span>Live Prompter</span>
          </button>
        </nav>
      </div>

      {/* Bottom status and CTA */}
      <div className="flex flex-col gap-3">
        {/* User Account */}
        <div className="p-3 rounded-lg bg-paper-raised flex items-center justify-between border border-paper-line/50">
          {user ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-forest text-on-forest flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-ink truncate max-w-[125px]" title={user.email || ''}>
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-ink-faint truncate max-w-[125px]">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={signOutUser}
                title="Sign out"
                className="text-ink-faint hover:text-ink cursor-pointer p-1.5 rounded hover:bg-paper-sunk transition-colors"
                aria-label="Sign out"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[17px]">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-2 text-ink text-xs font-medium hover:text-forest transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-forest">account_circle</span>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
};
