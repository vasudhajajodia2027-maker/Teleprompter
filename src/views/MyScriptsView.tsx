import React, { useState, useRef } from 'react';
import { Script, LicenseStatus } from '../types';
import { ASSETS } from '../data/defaultScripts';

interface MyScriptsViewProps {
  scripts: Script[];
  license: LicenseStatus;
  onOpenScriptEditor: (scriptId: string) => void;
  onOpenPrompter: (scriptId: string) => void;
  onNewScript: () => void;
  onDuplicateScript: (scriptId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onImportScript: (title: string, content: string) => void;
  onExportAllJson: () => void;
}

export const MyScriptsView: React.FC<MyScriptsViewProps> = ({
  scripts,
  license,
  onOpenScriptEditor,
  onOpenPrompter,
  onNewScript,
  onDuplicateScript,
  onDeleteScript,
  onImportScript,
  onExportAllJson,
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [sortOption, setSortOption] = useState<'lastEdited' | 'wordCount'>('lastEdited');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Count from the text itself so the library always matches the editor.
  const countWords = (content: string) => (content.trim() ? content.trim().split(/\s+/).length : 0);
  const readTime = (content: string, wpm: number) => {
    const s = Math.round((countWords(content) / (wpm || 150)) * 60);
    return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;
  };

  // Active script (hero card)
  const activeScript = scripts.find((s) => s.category === 'active') || scripts[0];
  const draftScripts = scripts.filter((s) => s.id !== activeScript?.id);
  // Default is library order (newest first); "Word Count" puts the longest first.
  if (sortOption === 'wordCount') {
    draftScripts.sort((a, b) => countWords(b.content) - countWords(a.content));
  }

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert('Choose a .txt or .md text file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      onImportScript(title, content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-[1120px] mx-auto w-full py-8 space-y-10">
        {/* Top Action & Title Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2">
            <h1 className="font-headline-lg text-3xl sm:text-4xl text-ink font-medium tracking-tight font-display">
              My Scripts
            </h1>
            <p className="font-label-meta text-xs text-ink-soft flex items-center gap-2">
              <span>{scripts.length} {scripts.length === 1 ? 'script' : 'scripts'} saved</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-lg bg-paper-raised text-ink font-body-sm text-sm font-medium hover:bg-paper-sunk transition-colors shadow-xs border border-paper-line flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-ink-soft">file_upload</span>
              <span>Import .txt</span>
            </button>
            <button
              onClick={onNewScript}
              className="px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New script</span>
            </button>
          </div>
        </header>

        {/* Script Library Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-xl font-semibold text-ink">Active Drafts &amp; Readings</h3>
            <div className="flex items-center gap-2">
              <span className="font-label-meta text-xs text-ink-faint">Sort by:</span>
              <button
                onClick={() => setSortOption(sortOption === 'lastEdited' ? 'wordCount' : 'lastEdited')}
                className="font-label-meta text-xs text-ink font-semibold flex items-center gap-1 hover:text-forest cursor-pointer"
              >
                {sortOption === 'lastEdited' ? 'Last Edited' : 'Word Count'}
                <span className="material-symbols-outlined text-[16px]">swap_vert</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1: Active Recent (Hero Manuscript Card) */}
            {activeScript && (
              <article className="lg:col-span-12 bg-paper-raised rounded-xl p-8 shadow-xs border border-paper-line flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6">
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-forest-tint text-forest font-label-meta text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
                        Active Reading
                      </span>
                      <span className="font-label-meta text-xs text-ink-soft">{activeScript.updatedAt}</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                      <span className="font-label-meta text-xs text-ink-soft">{countWords(activeScript.content)} words</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                      <span className="font-label-meta text-xs text-ink-soft">~{readTime(activeScript.content, activeScript.pacingWpm)} read</span>
                    </div>

                    <h4 className="font-headline-md text-2xl sm:text-3xl text-ink font-medium tracking-tight font-display">
                      {activeScript.title}
                    </h4>

                    {/* Editorial Quote / Script Preview Snippet */}
                    <div className="p-4 bg-paper-sunk/60 rounded-lg border border-paper-line/50">
                      <p className="font-body-lg text-base sm:text-lg text-ink font-prompter-reading italic leading-relaxed line-clamp-3">
                        "{activeScript.content.slice(0, 250)}..."
                      </p>
                    </div>
                  </div>

                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 bg-paper-sunk/20 -mx-8 -mb-8 p-6 rounded-b-xl border-t border-paper-line/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onOpenScriptEditor(activeScript.id)}
                      className="w-9 h-9 rounded-lg bg-paper-raised text-ink-soft hover:text-ink hover:bg-paper-sunk transition-colors flex items-center justify-center border border-paper-line cursor-pointer"
                      title="Edit script draft"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => onDuplicateScript(activeScript.id)}
                      className="w-9 h-9 rounded-lg bg-paper-raised text-ink-soft hover:text-ink hover:bg-paper-sunk transition-colors flex items-center justify-center border border-paper-line cursor-pointer"
                      title="Duplicate script"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                    <button
                      onClick={() => onDeleteScript(activeScript.id)}
                      className="w-9 h-9 rounded-lg bg-paper-raised text-ink-soft hover:text-rec hover:bg-rec-tint transition-colors flex items-center justify-center border border-paper-line cursor-pointer"
                      title="Delete script"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => onOpenScriptEditor(activeScript.id)}
                      className="px-4 py-2.5 rounded-lg bg-paper-raised text-ink font-body-sm text-sm font-medium hover:bg-paper-sunk transition-colors flex items-center justify-center gap-2 border border-paper-line cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">tune</span>
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => onOpenPrompter(activeScript.id)}
                      className="px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      <span>Open prompter</span>
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* Other Draft and Template Cards */}
            {draftScripts.map((script) => (
              <article
                key={script.id}
                className="lg:col-span-6 bg-paper-raised rounded-xl p-6 shadow-xs border border-paper-line flex flex-col justify-between gap-6 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-label-meta text-xs px-2.5 py-0.5 rounded-full ${
                        script.category === 'template'
                          ? 'bg-marker-soft text-on-marker font-medium'
                          : 'bg-paper-sunk text-ink-soft'
                      }`}
                    >
                      {script.category === 'template' ? 'Reusable Template' : 'Draft Script'}
                    </span>
                    <span className="font-label-meta text-xs text-ink-faint">{script.updatedAt}</span>
                  </div>

                  <h4 className="font-title-md text-lg text-ink font-semibold tracking-tight">
                    {script.title}
                  </h4>

                  <p className="font-body-sm text-sm text-ink-soft line-clamp-3 leading-relaxed">
                    "{script.content.slice(0, 160)}..."
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-ink-soft font-label-meta text-xs">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">notes</span> {countWords(script.content)} words
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span> ~{readTime(script.content, script.pacingWpm)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-paper-line/50">
                    <button
                      onClick={() => onOpenScriptEditor(script.id)}
                      className="text-ink font-body-sm text-sm hover:text-forest flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {script.category === 'template' ? 'Create script from template' : 'Continue editing'}
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDuplicateScript(script.id)}
                        className="w-8 h-8 rounded-lg bg-paper-sunk hover:bg-paper-line text-ink-soft hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                        title="Duplicate"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                      <button
                        onClick={() => onDeleteScript(script.id)}
                        className="w-8 h-8 rounded-lg bg-paper-sunk hover:bg-rec-tint text-ink-soft hover:text-rec flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Quick Upload & Storage Info Dual Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Quick Upload Card (Dashed Forest Border Drop Area) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`lg:col-span-7 bg-paper-raised rounded-xl p-8 shadow-xs flex flex-col items-center justify-center text-center group cursor-pointer transition-colors relative border-2 border-dashed ${
              isDragging ? 'border-forest bg-forest-tint/30' : 'border-forest/60 hover:bg-paper-sunk/30'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-forest-tint flex items-center justify-center text-forest mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
            </div>
            <h4 className="font-title-md text-base sm:text-lg text-ink font-semibold">Drop a .txt or .md script here</h4>
            <p className="font-body-sm text-sm text-ink-soft mt-1">or click to choose a file</p>
            <span className="mt-4 font-label-meta text-xs text-ink-faint">
              Plain text files (.txt or .md)
            </span>
          </div>

          {/* Storage Reminder Callout Card */}
          <aside className="lg:col-span-5 bg-marker-soft rounded-r-xl rounded-l-none p-6 flex flex-col justify-between shadow-xs relative border-l-4 border-[#E8C24F]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">info</span>
                <span className="font-label-eyebrow text-xs uppercase text-on-marker tracking-wider font-semibold">
                  Privacy &amp; Storage
                </span>
              </div>
              <p className="font-body-sm text-sm text-ink leading-relaxed">
                Scripts are saved in this browser, and to your account if you sign in. Download a backup file to keep a copy or move your scripts to another computer.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-marker-border/30 mt-4">
              <span className="font-label-meta text-xs text-ink-soft">
                Storage used: {(JSON.stringify(scripts).length / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={onExportAllJson}
                className="px-3 py-1.5 rounded bg-paper-raised text-ink hover:bg-paper font-label-meta text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 border border-paper-line cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Backup JSON</span>
              </button>
            </div>
          </aside>
        </section>

        {/* Contextual Creator Showcase / Studio Inspiration Strip */}
        <section className="bg-paper-sunk rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-paper-line">
          <div className="flex items-center gap-4">
            <img
              alt="Writing desk with a keyboard, a notebook and a microphone"
              className="w-16 h-16 rounded-lg object-cover shadow-xs shrink-0 border border-paper-line"
              src={ASSETS.writingDesk}
            />
            <div>
              <h4 className="font-title-md text-base sm:text-lg text-ink font-semibold">Voice Tracking Setup Guide</h4>
              <p className="font-body-sm text-sm text-ink-soft">
                How voice follow works, and how to set up your microphone and screen.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-4 py-2 rounded-lg bg-paper-raised text-ink hover:bg-paper font-body-sm text-sm font-medium transition-colors whitespace-nowrap shadow-xs border border-paper-line cursor-pointer"
          >
            View guide
          </button>
        </section>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-paper-raised rounded-xl max-w-lg w-full p-6 shadow-2xl border border-paper-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-paper-line">
              <h3 className="font-headline-sm text-lg font-semibold text-ink">How to set up voice follow</h3>
              <button onClick={() => setShowGuideModal(false)} className="text-ink-soft hover:text-ink cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 font-body-sm text-sm text-ink leading-relaxed">
              <p>
                <strong>1. Microphone.</strong> Use Chrome or Edge and allow the microphone when asked. Keep the mic 6–10 inches from your mouth. Word tracking works best in a quiet room.
              </p>
              <p>
                <strong>2. Notes in brackets.</strong> Add <code className="font-label-meta text-xs bg-paper-sunk px-1 py-0.5 rounded">[PAUSE 2s]</code> or <code className="font-label-meta text-xs bg-paper-sunk px-1 py-0.5 rounded">[CAMERA LOOK]</code> as reminders. They stay on screen. You don't read them aloud, and the script skips them.
              </p>
              <p>
                <strong>3. Eye line.</strong> The prompter keeps the text in a narrow column near the top of the screen. Put the window just below your camera so your eyes stay close to the lens.
              </p>
            </div>
            <div className="pt-3 border-t border-paper-line flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-forest text-on-forest rounded-lg font-body-sm text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
