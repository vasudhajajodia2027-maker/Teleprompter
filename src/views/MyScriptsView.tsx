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
  const [checklist, setChecklist] = useState({
    mic: true,
    cam: true,
    testRead: false,
    recordedTake: false,
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [sortOption, setSortOption] = useState<'lastEdited' | 'wordCount'>('lastEdited');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active script (hero card)
  const activeScript = scripts.find((s) => s.category === 'active') || scripts[0];
  const draftScripts = scripts.filter((s) => s.id !== activeScript?.id);

  const completedStepsCount = Object.values(checklist).filter(Boolean).length;

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert('Please upload a .txt or .md plain text file.');
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
            <div className="flex items-center gap-3">
              <span className="font-label-eyebrow text-xs uppercase text-forest font-bold tracking-widest bg-forest-tint px-2.5 py-1 rounded">
                Editorial Library
              </span>
              <span className="font-label-meta text-xs text-ink-faint">/app/scripts</span>
            </div>
            <h1 className="font-headline-lg text-3xl sm:text-4xl text-ink font-medium tracking-tight font-display">
              My Scripts
            </h1>
            <p className="font-label-meta text-xs text-ink-soft flex items-center gap-2">
              <span>{scripts.length} scripts saved</span>
              <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
              <span className="text-forest font-semibold">
                {license.isActive ? 'Pro Lifetime' : 'Free plan'}
              </span>
              <span className="text-ink-faint">
                ({scripts.filter((s) => s.category === 'active').length}/{license.isActive ? '∞' : '1'} active slot utilized)
              </span>
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

        {/* Onboarding Checklist Banner */}
        <section className="bg-paper-raised rounded-xl p-7 shadow-xs border border-paper-line relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left: Context & Progress */}
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-tint flex items-center justify-center text-forest">
                  <span className="material-symbols-outlined text-[20px]">movie_edit</span>
                </div>
                <div>
                  <h2 className="font-title-md text-base sm:text-lg text-ink font-semibold">
                    Get ready for your first take
                  </h2>
                  <span className="font-label-meta text-xs text-forest font-bold">
                    {completedStepsCount} of 4 steps complete
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                Calibrate ambient noise and establish eye contact before entering live voice-tracking mode.
              </p>
              {/* Native Gauge Progress Indicator */}
              <div className="w-full bg-paper-sunk h-2 rounded-full overflow-hidden border border-paper-line/50">
                <div
                  className="bg-forest h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedStepsCount / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Right: Interactive Checklist Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[560px]">
              {/* Item 1: Complete */}
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-paper-sunk/60 text-ink border border-paper-line/50">
                <div className="w-5 h-5 rounded bg-forest text-on-forest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <span className="font-body-sm text-sm line-through text-ink-soft">Allow microphone access</span>
              </div>

              {/* Item 2: Complete */}
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-paper-sunk/60 text-ink border border-paper-line/50">
                <div className="w-5 h-5 rounded bg-forest text-on-forest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <span className="font-body-sm text-sm line-through text-ink-soft">Allow camera access</span>
              </div>

              {/* Item 3: Interactive Test Read */}
              <button
                onClick={() => {
                  setChecklist((prev) => ({ ...prev, testRead: !prev.testRead }));
                }}
                className={`flex items-center justify-between p-3.5 rounded-lg transition-all text-left group cursor-pointer border ${
                  checklist.testRead
                    ? 'bg-paper-sunk/60 border-paper-line/50'
                    : 'bg-paper-sunk hover:bg-forest-tint border-paper-line'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center ${
                      checklist.testRead ? 'bg-forest text-on-forest' : 'bg-paper-raised border border-paper-line'
                    }`}
                  >
                    {checklist.testRead && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </div>
                  <span
                    className={`font-body-sm text-sm font-medium ${
                      checklist.testRead ? 'line-through text-ink-soft' : 'text-ink'
                    }`}
                  >
                    Do a 10-second test read
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-ink-soft group-hover:text-forest transition-colors">
                  {checklist.testRead ? 'replay' : 'arrow_forward'}
                </span>
              </button>

              {/* Item 4: Record Take CTA */}
              <button
                onClick={() => {
                  setChecklist((prev) => ({ ...prev, recordedTake: true }));
                  if (activeScript) onOpenPrompter(activeScript.id);
                }}
                className={`flex items-center justify-between p-3.5 rounded-lg text-ink transition-all text-left cursor-pointer border ${
                  checklist.recordedTake
                    ? 'bg-paper-sunk/60 border-paper-line/50'
                    : 'bg-paper-sunk hover:bg-forest-tint border-paper-line'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center ${
                      checklist.recordedTake ? 'bg-forest text-on-forest' : 'bg-paper-raised border border-paper-line'
                    }`}
                  >
                    {checklist.recordedTake && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </div>
                  <span
                    className={`font-body-sm text-sm font-medium ${
                      checklist.recordedTake ? 'line-through text-ink-soft' : 'text-ink'
                    }`}
                  >
                    Record your first take
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-forest">play_circle</span>
              </button>
            </div>
          </div>
        </section>

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
                      <span className="font-label-meta text-xs text-ink-soft">{activeScript.wordCount} words</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                      <span className="font-label-meta text-xs text-ink-soft">~{activeScript.estimatedReadTime} read</span>
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

                  {/* Visual Cadence Waveform Metric */}
                  <div className="bg-paper-sunk rounded-xl p-4 flex flex-col gap-3 min-w-[220px] border border-paper-line/50">
                    <div className="flex items-center justify-between text-ink-soft font-label-meta text-xs">
                      <span>Pacing Target</span>
                      <span className="text-forest font-bold">{activeScript.pacingWpm} WPM</span>
                    </div>

                    {/* Mini SVG Sparkline */}
                    <svg className="w-full h-8 text-forest" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 100 24">
                      <path d="M0 12 Q 10 2, 20 12 T 40 12 T 60 4 T 80 18 T 100 12" strokeLinecap="round" />
                    </svg>

                    <div className="flex items-center justify-between text-ink-faint font-label-meta text-[11px]">
                      <span>Intro</span>
                      <span>Climax</span>
                      <span>Outro</span>
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
                      <span className="material-symbols-outlined text-[16px]">notes</span> {script.wordCount} words
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span> ~{script.estimatedReadTime}
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
            <h4 className="font-title-md text-base sm:text-lg text-ink font-semibold">Drop your .txt script here</h4>
            <p className="font-body-sm text-sm text-ink-soft mt-1">or click to browse from local workstation</p>
            <span className="mt-4 font-label-meta text-xs text-ink-faint">
              UTF-8 Plain Text, Markdown supported (max 2MB)
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
                Scripts are stored locally in this browser. Export anytime to keep a backup or sync scripts between recording stations.
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
              alt="Warm atmospheric photo of an indie writing desk with mechanical keyboard, leather notebook, brass microphone"
              className="w-16 h-16 rounded-lg object-cover shadow-xs shrink-0 border border-paper-line"
              src={ASSETS.writingDesk}
            />
            <div>
              <h4 className="font-title-md text-base sm:text-lg text-ink font-semibold">Voice Tracking Setup Guide</h4>
              <p className="font-body-sm text-sm text-ink-soft">
                Learn how speech cadence auto-scrolling adapts to your speech rate with zero latency.
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
              <h3 className="font-headline-sm text-lg font-semibold text-ink">Voice Tracking Setup Guide</h3>
              <button onClick={() => setShowGuideModal(false)} className="text-ink-soft hover:text-ink cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 font-body-sm text-sm text-ink leading-relaxed">
              <p>
                <strong>1. Ambient Calibration:</strong> Place your microphone 6–10 inches from your mouth. The green VU meter will indicate comfortable vocal levels (-24 dB to -12 dB).
              </p>
              <p>
                <strong>2. Pacing Cues:</strong> Add <code className="font-label-meta text-xs bg-paper-sunk px-1 py-0.5 rounded">[PAUSE 2s]</code> or <code className="font-label-meta text-xs bg-paper-sunk px-1 py-0.5 rounded">[CAMERA LOOK]</code> syntax. When spoken aloud, First Take holds the yellow highlight on your clause.
              </p>
              <p>
                <strong>3. Gaze Centerline:</strong> Keep your script column constrained to 28 characters wide so your eye pupils remain steady and centered under the webcam lens.
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
