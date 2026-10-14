import React from 'react';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  currentView: 'scripts' | 'editor' | 'prompter' | 'pricing';
  activeSection?: 'scripts' | 'prompter' | 'tracking' | 'recordings';
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing') => void;
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
      <div className="flex flex-col gap-4">
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
