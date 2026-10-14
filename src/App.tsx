/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Script, LicenseStatus } from './types';
import { DEFAULT_SCRIPTS } from './data/defaultScripts';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { LandingPage } from './views/LandingPage';
import { MyScriptsView } from './views/MyScriptsView';
import { ScriptEditorView } from './views/ScriptEditorView';
import { LivePrompterView } from './views/LivePrompterView';
import { PricingView } from './views/PricingView';
import { CheckoutFlowView } from './views/CheckoutFlowView';
import { useAuth } from './context/AuthContext';
import { supabase } from '../utils/supabase/client';

export default function App() {
  const { user, signInWithGoogle } = useAuth();
  const [currentView, setCurrentView] = useState<'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout'>('overview');
  const [activeSidebarSection, setActiveSidebarSection] = useState<'scripts' | 'prompter' | 'tracking' | 'recordings'>('scripts');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('ft-08492');

  // Load scripts from localStorage or default
  const [scripts, setScripts] = useState<Script[]>(() => {
    try {
      const saved = localStorage.getItem('ft_scripts_store');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SCRIPTS;
  });

  // Load license from localStorage or default
  const [license, setLicense] = useState<LicenseStatus>(() => {
    try {
      const saved = localStorage.getItem('ft_license_store');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      isActive: false,
      key: '',
      plan: 'free',
      seat: 'Solo Creator',
    };
  });

  // Save scripts to localStorage as local-first fallback
  useEffect(() => {
    try {
      localStorage.setItem('ft_scripts_store', JSON.stringify(scripts));
    } catch (e) {
      console.error(e);
    }
  }, [scripts]);

  // Save license to localStorage as local-first fallback
  useEffect(() => {
    try {
      localStorage.setItem('ft_license_store', JSON.stringify(license));
    } catch (e) {
      console.error(e);
    }
  }, [license]);

  // Synchronize directly with Supabase when user is authenticated
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    // Fetch scripts from Supabase
    supabase
      .from('scripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data: cloudScripts, error }) => {
        if (isCancelled) return;
        if (error) {
          console.warn('Supabase fetch scripts note:', error.message);
          return;
        }
        if (Array.isArray(cloudScripts) && cloudScripts.length > 0) {
          // Format cloud scripts into app state
          const formatted: Script[] = cloudScripts.map((cs: any) => ({
            id: cs.id,
            title: cs.title,
            episodeTag: cs.episode_tag || undefined,
            category: cs.category || 'draft',
            content: cs.content,
            pacingWpm: cs.pacing_wpm || 140,
            wordCount: cs.word_count || 0,
            estimatedReadTime: cs.estimated_read_time || '1m 00s',
            updatedAt: cs.updated_at || 'Just now',
          }));
          setScripts(formatted);
          if (formatted.length > 0) {
            setSelectedScriptId(formatted[0].id);
          }
        } else if (Array.isArray(cloudScripts) && cloudScripts.length === 0) {
          // Seed initial user scripts into Supabase
          scripts.forEach(async (s) => {
            await supabase.from('scripts').upsert({
              id: s.id,
              user_id: user.id,
              title: s.title,
              episode_tag: s.episodeTag || null,
              category: s.category,
              content: s.content,
              pacing_wpm: s.pacingWpm,
              word_count: s.wordCount,
              estimated_read_time: s.estimatedReadTime,
              updated_at: s.updatedAt,
            });
          });
        }
      });

    // Fetch user license from Supabase
    supabase
      .from('licenses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: lic, error }) => {
        if (isCancelled) return;
        if (error) {
          console.warn('Supabase license fetch note:', error.message);
          return;
        }
        if (lic && lic.is_pro) {
          setLicense({
            isActive: true,
            key: 'PRO-CLOUD-ACTIVATED',
            plan: 'lifetime',
            seat: 'Solo Creator',
            activatedAt: lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : 'Active',
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const activeScript = scripts.find((s) => s.id === selectedScriptId) || scripts[0];

  // Helper to persist script to Supabase
  const persistScriptToCloud = useCallback(
    async (script: Script) => {
      if (!user) return;
      try {
        const { error } = await supabase.from('scripts').upsert({
          id: script.id,
          user_id: user.id,
          title: script.title,
          episode_tag: script.episodeTag || null,
          category: script.category,
          content: script.content,
          pacing_wpm: script.pacingWpm,
          word_count: script.wordCount,
          estimated_read_time: script.estimatedReadTime,
          updated_at: script.updatedAt,
        });
        if (error) {
          console.warn('Supabase upsert script error:', error.message);
        }
      } catch (err) {
        console.warn('Local fallback active; Supabase sync note:', err);
      }
    },
    [user]
  );

  // Actions
  const handleOpenScriptEditor = (scriptId?: string) => {
    if (scriptId) setSelectedScriptId(scriptId);
    setActiveSidebarSection('scripts');
    setCurrentView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPrompter = (scriptId?: string) => {
    if (scriptId) setSelectedScriptId(scriptId);
    setCurrentView('prompter');
  };

  const handleNewScript = () => {
    const newId = `ft-${Math.floor(10000 + Math.random() * 90000)}`;
    const newScript: Script = {
      id: newId,
      title: 'Untitled Manuscript',
      episodeTag: 'Episode Draft · New',
      category: 'draft',
      pacingWpm: 150,
      updatedAt: 'Just now',
      wordCount: 0,
      estimatedReadTime: '0s',
      content: 'Write or paste your script text here...\n\n[PAUSE 2s]\n\nDeliver with steady presence.',
    };
    setScripts((prev) => [newScript, ...prev]);
    setSelectedScriptId(newId);
    setActiveSidebarSection('scripts');
    setCurrentView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistScriptToCloud(newScript);
  };

  const handleDuplicateScript = (scriptId: string) => {
    const target = scripts.find((s) => s.id === scriptId);
    if (!target) return;
    const duplicated: Script = {
      ...target,
      id: `ft-${Math.floor(10000 + Math.random() * 90000)}`,
      title: `Copy of ${target.title}`,
      updatedAt: 'Just now',
      category: 'draft',
    };
    setScripts((prev) => [duplicated, ...prev]);
    setSelectedScriptId(duplicated.id);
    persistScriptToCloud(duplicated);
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (scripts.length <= 1) {
      alert('You must keep at least one script in your editorial workspace.');
      return;
    }
    if (confirm('Delete this script permanently? This action cannot be reversed.')) {
      const remaining = scripts.filter((s) => s.id !== scriptId);
      setScripts(remaining);
      if (selectedScriptId === scriptId) {
        setSelectedScriptId(remaining[0].id);
      }
      if (currentView === 'editor') {
        setCurrentView('scripts');
      }
      if (user) {
        try {
          await supabase.from('scripts').delete().eq('id', scriptId).eq('user_id', user.id);
        } catch (e) {
          console.warn('Supabase delete script note:', e);
        }
      }
    }
  };

  const handleImportScript = (title: string, content: string) => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const seconds = Math.round((words / 150) * 60);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    const imported: Script = {
      id: `ft-${Math.floor(10000 + Math.random() * 90000)}`,
      title,
      episodeTag: 'Imported .txt',
      category: 'draft',
      pacingWpm: 150,
      updatedAt: 'Just now',
      wordCount: words,
      estimatedReadTime: `${m}m ${s.toString().padStart(2, '0')}s`,
      content,
    };
    setScripts((prev) => [imported, ...prev]);
    setSelectedScriptId(imported.id);
    setCurrentView('editor');
    persistScriptToCloud(imported);
    alert(`Script "${title}" successfully imported (${words} words).`);
  };

  const handleUpdateScript = (updated: Script) => {
    setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    persistScriptToCloud(updated);
  };

  const handleExportAllJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scripts, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `first-take-backup-${new Date().toISOString().split('T')[0]}.json`);
    a.click();
  };

  const handleActivateKey = (key: string): boolean => {
    if (key.length >= 6) {
      setLicense({
        isActive: true,
        key,
        plan: 'lifetime',
        seat: 'Solo Creator',
        activatedAt: new Date().toLocaleDateString(),
      });
      return true;
    }
    return false;
  };

  const handleDeactivateKey = () => {
    if (confirm('Deactivate First Take Pro on this computer?')) {
      setLicense({
        isActive: false,
        key: '',
        plan: 'free',
        seat: 'Solo Creator',
      });
    }
  };

  const handlePurchaseComplete = (_email: string) => {
    setLicense({
      isActive: true,
      key: 'LIFETIME-ACCESS',
      plan: 'lifetime',
      seat: 'Solo Creator',
      activatedAt: new Date().toLocaleDateString(),
    });
  };

  const handleNavigate = (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout') => {
    setCurrentView(view);
    if (view === 'scripts') setActiveSidebarSection('scripts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Full-screen Checkout Flow View
  if (currentView === 'checkout') {
    return (
      <CheckoutFlowView
        initialEmail={user?.email || ''}
        onExit={() => handleNavigate('overview')}
        onCompletePurchase={handlePurchaseComplete}
        onOpenPrompter={() => handleOpenPrompter(activeScript.id)}
        onOpenScripts={() => handleNavigate('scripts')}
      />
    );
  }

  // Full-screen Live Prompter View
  if (currentView === 'prompter') {
    return (
      <LivePrompterView
        script={activeScript}
        onExit={() => setCurrentView('scripts')}
        isPro={license.isActive}
      />
    );
  }

  // Dashboard layout with Sidebar (for Scripts & Editor)
  const isDashboardView = currentView === 'scripts' || currentView === 'editor';

  return (
    <div className="bg-paper min-h-screen text-ink antialiased selection:bg-marker selection:text-ink">
      {isDashboardView ? (
        <>
          <Sidebar
            currentView={currentView}
            activeSection={activeSidebarSection}
            onNavigate={handleNavigate}
            onNewScript={handleNewScript}
            onSelectSection={(sec) => {
              setActiveSidebarSection(sec);
              if (sec === 'scripts') setCurrentView('scripts');
              else if (sec === 'prompter') handleOpenPrompter(activeScript.id);
              else if (sec === 'tracking' || sec === 'recordings') {
                setCurrentView('scripts');
              }
            }}
          />

          <div className="pl-64 min-h-screen flex flex-col">
            {/* Top Workspace Header */}
            <header className="fixed top-0 left-64 right-0 h-16 bg-paper/85 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-paper-line/50 z-40 flex items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('overview')}
                  className="font-label-meta text-xs text-ink-soft uppercase tracking-wider hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
                  title="View Landing Page"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Workspace</span>
                </button>
                <span className="text-paper-line-strong">/</span>
                <span className="font-label-meta text-xs text-ink font-semibold">
                  {currentView === 'editor' ? 'Script Editor' : 'Library'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-sunk font-label-meta text-xs text-ink-soft border border-paper-line/50">
                  <span className="material-symbols-outlined text-[16px] text-forest">mic</span>
                  <span>Auto-Scroll Active</span>
                </div>
                {user ? (
                  <div
                    className="w-8 h-8 rounded-full bg-forest text-on-forest flex items-center justify-center font-bold text-xs shadow-xs"
                    title={`Logged in as ${user.email} (Database Connected)`}
                  >
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="px-3 py-1.5 rounded-lg bg-paper-sunk hover:bg-paper-line/40 text-ink font-body-sm text-xs font-medium border border-paper-line flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Sign in with Google to sync with database"
                  >
                    <span className="material-symbols-outlined text-[16px] text-forest">cloud</span>
                    <span>Sign in</span>
                  </button>
                )}
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="relative pt-16 bg-paper min-h-screen w-full px-8">
              {currentView === 'scripts' ? (
                <MyScriptsView
                  scripts={scripts}
                  license={license}
                  onOpenScriptEditor={handleOpenScriptEditor}
                  onOpenPrompter={handleOpenPrompter}
                  onNewScript={handleNewScript}
                  onDuplicateScript={handleDuplicateScript}
                  onDeleteScript={handleDeleteScript}
                  onImportScript={handleImportScript}
                  onExportAllJson={handleExportAllJson}
                />
              ) : (
                <ScriptEditorView
                  script={activeScript}
                  onUpdateScript={handleUpdateScript}
                  onOpenPrompter={handleOpenPrompter}
                  onDuplicateScript={handleDuplicateScript}
                  onDeleteScript={handleDeleteScript}
                  onBackToScripts={() => setCurrentView('scripts')}
                />
              )}
            </main>
          </div>
        </>
      ) : (
        /* Standalone Marketing / Public Layout (Landing Page & Pricing) */
        <div className="flex flex-col min-h-screen">
          <Header
            currentView={currentView}
            onNavigate={handleNavigate}
            isPro={license.isActive}
          />
          <main className="w-full pt-16 bg-paper min-h-screen flex-1">
            {currentView === 'overview' ? (
              <LandingPage
                onNavigate={handleNavigate}
                onOpenScriptEditor={handleOpenScriptEditor}
              />
            ) : (
              <PricingView
                license={license}
                onStartCheckout={() => handleNavigate('checkout')}
                onDeactivateKey={handleDeactivateKey}
                onOpenSandbox={() => handleNavigate('scripts')}
              />
            )}
          </main>
          <Footer />
        </div>
      )}
    </div>
  );
}
