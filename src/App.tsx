/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Script, LicenseStatus } from './types';
import { DEFAULT_SCRIPTS } from './data/defaultScripts';
import { nowStamp } from './lib/scriptTime';
import { formatStoredReadTime, readSeconds, spokenWordCount } from './lib/scriptText';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ConsentBanner } from './components/ConsentBanner';
import { LandingPage } from './views/LandingPage';
import { MyScriptsView } from './views/MyScriptsView';
import { ScriptEditorView } from './views/ScriptEditorView';
import { LivePrompterView } from './views/LivePrompterView';
import { PricingView } from './views/PricingView';
import { CheckoutFlowView } from './views/CheckoutFlowView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsOfServiceView } from './views/TermsOfServiceView';
import { useAuth } from './context/AuthContext';
import { supabase } from '../utils/supabase/client';
import { RESUME_CHECKOUT_KEY } from './lib/payments';

const LICENSE_CACHE_KEY = 'ft_license_store';

const FREE_LICENSE: LicenseStatus = {
  isActive: false,
  key: '',
  plan: 'free',
  seat: 'Solo Creator',
};

// Pro comes only from the signed-in user's row in the Supabase licenses table
// (clients can read it but not write it). An error or a missing row is free.
async function fetchServerLicense(userId: string): Promise<LicenseStatus | null> {
  const { data: lic, error } = await supabase
    .from('licenses')
    .select('is_pro, activated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Supabase license fetch note:', error.message);
    return null;
  }
  if (!lic?.is_pro) return FREE_LICENSE;
  return {
    isActive: true,
    key: 'PRO-CLOUD-ACTIVATED',
    plan: 'lifetime',
    seat: 'Solo Creator',
    activatedAt: lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : 'Active',
  };
}

export type AppView = 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout' | 'privacy' | 'terms';

function getInitialView(): AppView {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    if (path === '/privacy' || path.startsWith('/privacy')) return 'privacy';
    if (path === '/terms' || path.startsWith('/terms')) return 'terms';
    if (path === '/checkout' || path.startsWith('/checkout')) return 'checkout';
    if (path === '/pricing' || path.startsWith('/pricing')) return 'pricing';
    if (path === '/scripts' || path.startsWith('/scripts')) return 'scripts';
    if (path === '/editor' || path.startsWith('/editor')) return 'editor';
    if (path === '/prompter' || path.startsWith('/prompter')) return 'prompter';
  }
  return 'overview';
}

function getPathForView(view: AppView): string {
  switch (view) {
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
    case 'checkout':
      return '/checkout';
    case 'pricing':
      return '/pricing';
    case 'scripts':
      return '/scripts';
    case 'editor':
      return '/editor';
    case 'prompter':
      return '/prompter';
    case 'overview':
    default:
      return '/';
  }
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [activeSidebarSection, setActiveSidebarSection] = useState<'scripts' | 'prompter'>('scripts');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('ft-08492');

  // Sync state with browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const detected = getInitialView();
      setCurrentView(detected);
      if (detected === 'scripts') setActiveSidebarSection('scripts');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update browser document title based on view
  useEffect(() => {
    if (currentView === 'privacy') {
      document.title = 'Privacy Policy — First Take';
    } else if (currentView === 'terms') {
      document.title = 'Terms of Service — First Take';
    } else if (currentView === 'pricing') {
      document.title = 'Pricing — First Take';
    } else if (currentView === 'checkout') {
      document.title = 'Join the Waitlist — First Take';
    } else {
      document.title = 'First Take — Speech-Responsive Teleprompter';
    }
  }, [currentView]);

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

  // localStorage only seeds what is displayed until the server answers; it
  // never decides Pro. isPro is true only once the licenses row for the
  // current user has been read from Supabase.
  const [license, setLicense] = useState<LicenseStatus>(() => {
    try {
      const saved = localStorage.getItem(LICENSE_CACHE_KEY);
      if (saved) return { ...FREE_LICENSE, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return FREE_LICENSE;
  });
  const [licenseVerifiedFor, setLicenseVerifiedFor] = useState<string | null>(null);
  const isPro = !!user && licenseVerifiedFor === user.id && license.isActive;

  // Save scripts to localStorage as local-first fallback
  useEffect(() => {
    try {
      localStorage.setItem('ft_scripts_store', JSON.stringify(scripts));
    } catch (e) {
      console.error(e);
    }
  }, [scripts]);

  // Re-reads the license from Supabase; resolves true when the user is Pro.
  const refreshLicense = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const serverLicense = await fetchServerLicense(user.id);
    setLicense(serverLicense ?? FREE_LICENSE);
    setLicenseVerifiedFor(serverLicense ? user.id : null);
    return !!serverLicense?.isActive;
  }, [user]);

  // Signed out is free. Signed in, the server value overwrites the cache.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLicense(FREE_LICENSE);
      setLicenseVerifiedFor(null);
      return;
    }
    let isCancelled = false;
    fetchServerLicense(user.id).then((serverLicense) => {
      if (isCancelled) return;
      setLicense(serverLicense ?? FREE_LICENSE);
      setLicenseVerifiedFor(serverLicense ? user.id : null);
    });
    return () => {
      isCancelled = true;
    };
  }, [user, authLoading]);

  // Display cache only: written after the server (or sign-out) sets the value.
  useEffect(() => {
    if (authLoading) return;
    try {
      localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(license));
    } catch (e) {
      console.error(e);
    }
  }, [license, authLoading]);

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
            updatedAt: cs.updated_at || '',
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
    handleNavigate('editor');
  };

  // Exit from the prompter goes back to where it was opened from.
  const [prompterReturnView, setPrompterReturnView] = useState<AppView>('scripts');
  const handleOpenPrompter = (scriptId?: string) => {
    if (scriptId) setSelectedScriptId(scriptId);
    setPrompterReturnView(currentView === 'editor' ? 'editor' : 'scripts');
    handleNavigate('prompter');
  };

  const handleNewScript = () => {
    const newId = `ft-${Math.floor(10000 + Math.random() * 90000)}`;
    const newScript: Script = {
      id: newId,
      title: 'Untitled Manuscript',
      episodeTag: 'Episode Draft · New',
      category: 'draft',
      pacingWpm: 150,
      updatedAt: nowStamp(),
      wordCount: 0,
      estimatedReadTime: '0s',
      content: 'Write or paste your script here.\n\n[PAUSE 2s]\n\nText in brackets is a note to yourself. You don\'t read it aloud.',
    };
    setScripts((prev) => [newScript, ...prev]);
    setSelectedScriptId(newId);
    setActiveSidebarSection('scripts');
    handleNavigate('editor');
    persistScriptToCloud(newScript);
  };

  const handleDuplicateScript = (scriptId: string) => {
    const target = scripts.find((s) => s.id === scriptId);
    if (!target) return;
    const duplicated: Script = {
      ...target,
      id: `ft-${Math.floor(10000 + Math.random() * 90000)}`,
      title: `Copy of ${target.title}`,
      updatedAt: nowStamp(),
      category: 'draft',
    };
    setScripts((prev) => [duplicated, ...prev]);
    setSelectedScriptId(duplicated.id);
    persistScriptToCloud(duplicated);
  };

  // A template is never edited directly: start a new draft from a copy of it.
  const handleUseTemplate = (templateId: string) => {
    const template = scripts.find((s) => s.id === templateId);
    if (!template) return;
    const draft: Script = {
      ...template,
      id: `ft-${Math.floor(10000 + Math.random() * 90000)}`,
      title: `New ${template.title}`,
      episodeTag: 'Draft · From template',
      updatedAt: nowStamp(),
      category: 'draft',
    };
    setScripts((prev) => [draft, ...prev]);
    persistScriptToCloud(draft);
    handleOpenScriptEditor(draft.id);
  };

  // Restore a file made with "Download backup". Scripts already in the
  // library (same id) are left alone; returns how many were added.
  const handleRestoreBackup = (backup: unknown): number => {
    if (!Array.isArray(backup)) return -1;
    const existing = new Set(scripts.map((s) => s.id));
    const restored: Script[] = backup
      .filter(
        (s: any) =>
          !!s && typeof s === 'object' && typeof s.id === 'string' && typeof s.title === 'string' &&
          typeof s.content === 'string' && !existing.has(s.id)
      )
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        episodeTag: typeof s.episodeTag === 'string' ? s.episodeTag : undefined,
        category: s.category === 'template' ? 'template' : 'draft',
        pacingWpm: typeof s.pacingWpm === 'number' ? s.pacingWpm : 150,
        updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : '',
        wordCount: typeof s.wordCount === 'number' ? s.wordCount : 0,
        estimatedReadTime: typeof s.estimatedReadTime === 'string' ? s.estimatedReadTime : '',
      }));
    if (restored.length > 0) {
      setScripts((prev) => [...prev, ...restored]);
      restored.forEach((s) => persistScriptToCloud(s));
    }
    return restored.length;
  };

  // Delete is instant; for a few seconds "Undo" puts the script back where it
  // was, here and in the account. A second delete makes the first one final.
  const UNDO_MS = 8000;
  const [undoDelete, setUndoDelete] = useState<{ script: Script; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The account delete still in flight, so Undo re-saves only after it lands.
  const pendingCloudDeleteRef = useRef<Promise<unknown>>(Promise.resolve());
  const clearUndoTimer = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
  };
  useEffect(() => clearUndoTimer, []);

  const handleDeleteScript = async (scriptId: string) => {
    if (scripts.length <= 1) {
      alert('You must keep at least one script in your editorial workspace.');
      return;
    }
    const index = scripts.findIndex((s) => s.id === scriptId);
    if (index < 0) return;
    const deleted = scripts[index];
    const remaining = scripts.filter((s) => s.id !== scriptId);
    setScripts(remaining);
    if (selectedScriptId === scriptId) {
      setSelectedScriptId(remaining[0].id);
    }
    if (currentView === 'editor') {
      handleNavigate('scripts');
    }
    clearUndoTimer();
    setUndoDelete({ script: deleted, index });
    undoTimerRef.current = setTimeout(() => setUndoDelete(null), UNDO_MS);
    if (user) {
      const cloudDelete = (async () => {
        try {
          await supabase.from('scripts').delete().eq('id', scriptId).eq('user_id', user.id);
        } catch (e) {
          console.warn('Supabase delete script note:', e);
        }
      })();
      pendingCloudDeleteRef.current = cloudDelete;
      await cloudDelete;
    }
  };

  const handleUndoDelete = () => {
    if (!undoDelete) return;
    const { script, index } = undoDelete;
    clearUndoTimer();
    setUndoDelete(null);
    setScripts((prev) => {
      if (prev.some((s) => s.id === script.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, script);
      return next;
    });
    pendingCloudDeleteRef.current.then(() => persistScriptToCloud(script));
  };

  const handleImportScript = (title: string, content: string) => {
    const words = spokenWordCount(content);

    const imported: Script = {
      id: `ft-${Math.floor(10000 + Math.random() * 90000)}`,
      title: title.trim() || 'Untitled',
      episodeTag: 'Imported file',
      category: 'draft',
      pacingWpm: 150,
      updatedAt: nowStamp(),
      wordCount: words,
      estimatedReadTime: formatStoredReadTime(readSeconds(content, 150)),
      content,
    };
    setScripts((prev) => [imported, ...prev]);
    setSelectedScriptId(imported.id);
    handleNavigate('editor');
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


  // Back from the Google sign-in started on the checkout page.
  useEffect(() => {
    if (!user) return;
    try {
      if (sessionStorage.getItem(RESUME_CHECKOUT_KEY)) {
        sessionStorage.removeItem(RESUME_CHECKOUT_KEY);
        handleNavigate('checkout');
      }
    } catch (e) {
      console.warn(e);
    }
  }, [user]);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    if (view === 'scripts') setActiveSidebarSection('scripts');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update browser URL seamlessly for real direct URL support
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView(view);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
    }
  };

  // Full-screen Checkout Flow View
  if (currentView === 'checkout') {
    return (
      <CheckoutFlowView
        initialEmail={user?.email || ''}
        isSignedIn={!!user}
        isPro={isPro}
        onRefreshLicense={refreshLicense}
        onExit={() => handleNavigate('overview')}
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
        onExit={() => handleNavigate(prompterReturnView)}
        isPro={isPro}
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
              if (sec === 'scripts') handleNavigate('scripts');
              else if (sec === 'prompter') handleOpenPrompter(activeScript.id);
            }}
          />

          {/* Scripts never reach Clarity session replays. */}
          <div className="pl-64 min-h-screen flex flex-col" data-clarity-mask="true">
            {/* Top Workspace Header */}
            <header className="fixed top-0 left-64 right-0 h-16 bg-paper shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-paper-line/50 z-40 flex items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigate('overview')}
                  className="font-label-meta text-xs text-ink-soft uppercase tracking-wider hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Back to the home page"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Home</span>
                </button>
              </div>
              {/* Sign-in and account live in the sidebar */}
            </header>

            {/* Dashboard Content */}
            <main className="relative pt-20 bg-paper min-h-screen w-full px-8">
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
                  onUseTemplate={handleUseTemplate}
                  onRestoreBackup={handleRestoreBackup}
                />
              ) : (
                <ScriptEditorView
                  script={activeScript}
                  onUpdateScript={handleUpdateScript}
                  onOpenPrompter={handleOpenPrompter}
                  onDuplicateScript={handleDuplicateScript}
                  onDeleteScript={handleDeleteScript}
                  onBackToScripts={() => handleNavigate('scripts')}
                />
              )}
            </main>

            {undoDelete && (
              <div
                role="status"
                className="fixed bottom-6 left-[calc(50%+128px)] -translate-x-1/2 z-50 flex items-center gap-4 pl-5 pr-2 py-2 rounded-xl bg-night-paper text-white shadow-2xl font-body-sm text-sm"
              >
                <span className="max-w-[320px] truncate">Deleted “{undoDelete.script.title}”</span>
                <button
                  onClick={handleUndoDelete}
                  className="px-3 py-1.5 rounded-lg font-semibold text-marker hover:bg-white/10 cursor-pointer"
                >
                  Undo
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Standalone Marketing / Public Layout (Landing Page, Pricing, Privacy, Terms) */
        <div className="flex flex-col min-h-screen">
          <Header
            currentView={currentView}
            onNavigate={handleNavigate}
            isPro={isPro}
          />
          <main className="w-full pt-16 bg-paper min-h-screen flex-1">
            {currentView === 'privacy' ? (
              <PrivacyPolicyView onNavigate={handleNavigate} />
            ) : currentView === 'terms' ? (
              <TermsOfServiceView onNavigate={handleNavigate} />
            ) : currentView === 'pricing' ? (
              <PricingView
                license={license}
                onStartCheckout={() => handleNavigate('checkout')}
                onOpenSandbox={() => handleNavigate('scripts')}
              />
            ) : (
              <LandingPage
                onNavigate={handleNavigate}
                onOpenScriptEditor={handleOpenScriptEditor}
              />
            )}
          </main>
          <Footer onNavigate={handleNavigate} />
        </div>
      )}
      <ConsentBanner />
    </div>
  );
}
