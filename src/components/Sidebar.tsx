import React from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout';
  activeSection?: 'scripts' | 'prompter' | 'tracking' | 'recordings';
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout') => void;
  onNewScript: () => void;
  onSelectSection?: (section: 'scripts' | 'prompter' | 'tracking' | 'recordings') => void;
  isMicActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeSection = 'scripts',
  onNavigate,
  onNewScript,
  onSelectSection,
  isMicActive = true,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const handleNav = (target: 'scripts' | 'prompter' | 'tracking' | 'recordings') => {
    if (onSelectSection) onSelectSection(target);
    if (target === 'scripts') onNavigate('scripts');
    else if (target === 'prompter') onNavigate('prompter');
    else if (target === 'tracking') onNavigate('scripts');
    else if (target === 'recordings') onNavigate('scripts');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-paper-sunk z-50 flex flex-col justify-between p-6 border-r border-paper-line">
      <div className="flex flex-col gap-8">
        {/* Brand */}
        <button 
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-3 text-left focus:outline-none cursor-pointer group"
        >
          <BrandLogo size="sm" subtitleText="App" />
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
            <span className="material-symbols-outlined text-[20px]">description</span>
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
            <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
            <span>Live Prompter</span>
          </button>

          <button
            onClick={() => handleNav('tracking')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeSection === 'tracking'
                ? 'bg-paper-raised text-forest font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                : 'font-body-sm text-sm text-on-surface-variant hover:bg-paper-raised hover:text-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
            <span>Voice Tracking</span>
          </button>

          <button
            onClick={() => handleNav('recordings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeSection === 'recordings'
                ? 'bg-paper-raised text-forest font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.03)]'
                : 'font-body-sm text-sm text-on-surface-variant hover:bg-paper-raised hover:text-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
            <span>Recordings</span>
          </button>
        </nav>
      </div>

      {/* Bottom status and CTA */}
      <div className="flex flex-col gap-3">
        {/* User Account & Database Sync */}
        <div className="p-3 rounded-lg bg-paper-raised flex items-center justify-between border border-paper-line/50">
          {user ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-forest text-on-forest flex items-center justify-center font-bold text-xs shrink-0">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-ink truncate max-w-[105px]" title={user.email || ''}>
                    {user.email?.split('@')[0]}
                  </p>
                  <span className="text-[10px] text-forest font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
                    Postgres Synced
                  </span>
                </div>
              </div>
              <button
                onClick={signOutUser}
                title="Sign out"
                className="text-ink-faint hover:text-ink cursor-pointer p-1 rounded hover:bg-paper-sunk transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-ink text-xs font-medium hover:text-forest transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-forest">cloud_sync</span>
              <span>Sign in to Sync</span>
            </button>
          )}
        </div>

        {/* Mic telemetry pill */}
        <div className="p-3 rounded-lg bg-paper-raised flex items-center justify-between border border-paper-line/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-forest animate-pulse' : 'bg-ink-faint'}`}></div>
            <span className="font-label-meta text-xs text-ink-soft">
              {isMicActive ? 'Mic Ready' : 'Mic Off'}
            </span>
          </div>
          <span className="font-label-meta text-xs text-forest font-bold">48kHz</span>
        </div>

        {/* New script action */}
        <button
          onClick={onNewScript}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all duration-150 cursor-pointer shadow-sm active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New script</span>
        </button>
      </div>
    </aside>
  );
};
