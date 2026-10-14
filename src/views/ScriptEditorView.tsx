import React, { useState, useEffect, useRef } from 'react';
import { Script } from '../types';

interface ScriptEditorViewProps {
  script: Script;
  onUpdateScript: (updated: Script) => void;
  onOpenPrompter: (scriptId: string) => void;
  onDuplicateScript: (scriptId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onBackToScripts: () => void;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  script,
  onUpdateScript,
  onOpenPrompter,
  onDuplicateScript,
  onDeleteScript,
  onBackToScripts,
}) => {
  const [title, setTitle] = useState(script.title);
  const [content, setContent] = useState(script.content);
  const [pacingWpm, setPacingWpm] = useState(script.pacingWpm || 150);
  const [saveStatus, setSaveStatus] = useState('Saved locally just now');
  const [micDb, setMicDb] = useState(-24);
  const [vuHeights, setVuHeights] = useState([20, 40, 65, 85, 50, 25, 15, 45, 70, 30, 10, 10]);
  const [isMirrorInverted, setIsMirrorInverted] = useState(false);
  const [showProTip, setShowProTip] = useState(true);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate metrics
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const totalSeconds = Math.round((words / pacingWpm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedReadTime = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  const quotaPercent = Math.min((totalSeconds / 120) * 100, 100);

  // Sync state changes with parent
  useEffect(() => {
    setTitle(script.title);
    setContent(script.content);
    setPacingWpm(script.pacingWpm || 150);
  }, [script.id]);

  const triggerUpdate = (newTitle: string, newContent: string, newWpm: number) => {
    setSaveStatus('Saving changes...');
    const updatedWords = newContent.trim() ? newContent.trim().split(/\s+/).filter(Boolean).length : 0;
    const s = Math.round((updatedWords / newWpm) * 60);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const estTime = `${m}m ${sec.toString().padStart(2, '0')}s`;

    onUpdateScript({
      ...script,
      title: newTitle,
      content: newContent,
      pacingWpm: newWpm,
      wordCount: updatedWords,
      estimatedReadTime: estTime,
      updatedAt: 'Just now',
    });

    setTimeout(() => {
      setSaveStatus('Saved locally just now');
    }, 400);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerUpdate(val, content, pacingWpm);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerUpdate(title, val, pacingWpm);
  };

  const handlePaceChange = (val: number) => {
    setPacingWpm(val);
    triggerUpdate(title, content, val);
  };

  const insertSyntax = (syntax: string) => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const currentVal = content;

    const before = currentVal.substring(0, start);
    const selected = currentVal.substring(start, end);
    const after = currentVal.substring(end);

    let inserted = '';
    if (syntax === '*emphasis*') {
      inserted = selected ? `*${selected}*` : `*emphasis*`;
    } else {
      inserted = `\n\n${syntax}\n\n`;
    }

    const updated = before + inserted + after;
    setContent(updated);
    triggerUpdate(title, updated, pacingWpm);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + inserted.length;
      }
    }, 50);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear this manuscript draft?')) {
      setContent('');
      triggerUpdate(title, '', pacingWpm);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      setContent(text);
      triggerUpdate(title, text, pacingWpm);
    };
    reader.readAsText(file);
  };

  const exportTextFile = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.trim() || 'script'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // VU Meter audio simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const randDb = -18 - Math.floor(Math.random() * 16);
      setMicDb(randDb);
      setVuHeights(
        Array.from({ length: 12 }, () => Math.floor(Math.random() * 75) + 15)
      );
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="max-w-[1120px] mx-auto w-full pt-4 space-y-6">
        {/* Top Bar Navigation & Actions */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-paper-line/60">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToScripts}
                className="text-ink-soft hover:text-ink flex items-center gap-1 font-label-meta text-xs cursor-pointer mr-1"
                title="Back to scripts"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Scripts</span>
              </button>
              <span className="text-paper-line-strong">/</span>
              <span className="font-label-eyebrow text-xs text-ink-soft uppercase tracking-wider">
                {script.episodeTag || 'Episode 14 · Script'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest-tint text-forest font-label-meta text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
                Draft Ready
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <input
                aria-label="Script title"
                className="font-headline-md text-2xl sm:text-3xl text-ink bg-transparent focus:outline-none focus:bg-paper-sunk/60 rounded px-1 -ml-1 transition-colors w-full max-w-2xl font-medium tracking-tight font-display"
                value={title}
                onChange={handleTitleChange}
              />
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="material-symbols-outlined text-[15px] text-forest">check_circle</span>
              <p className="font-label-meta text-xs text-ink-soft">{saveStatus}</p>
            </div>
          </div>

          {/* Primary Control Action */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              onClick={() => alert(`Target Pace: ${pacingWpm} WPM. Estimated read time is ${formattedReadTime} for ${words} words.`)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-paper-raised text-ink font-body-sm text-sm hover:bg-paper-sunk transition-colors border border-paper-line cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-ink-soft">speed</span>
              <span>Pace Guide</span>
            </button>
            <button
              onClick={() => onOpenPrompter(script.id)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm hover:bg-forest-dark transition-all transform active:scale-95 shadow-xs cursor-pointer font-medium"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              <span className="tracking-wide">Open Prompter</span>
            </button>
          </div>
        </section>

        {/* Editorial Layout Grid: 2 Columns (Editor 70%, Metarail 30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Workspace: The Tactile Script Canvas */}
          <main className="lg:col-span-8 flex flex-col gap-4">
            {/* In-Editor Toolbar Strip */}
            <div className="bg-paper-raised rounded-lg p-2 flex flex-wrap items-center justify-between gap-3 border border-paper-line shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => insertSyntax('[PAUSE 2s]')}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Insert 2-second pacing pause cue"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-tertiary">timer</span>
                  <span>+ 2s Pause</span>
                </button>
                <button
                  onClick={() => insertSyntax('[CAMERA LOOK]')}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Insert camera gaze alignment cue"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                  <span>+ Lens Cue</span>
                </button>
                <button
                  onClick={() => insertSyntax('*emphasis*')}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Mark stressed vocal accent"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-ink-soft">format_italic</span>
                  <span>Stress</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors border border-paper-line/50"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-ink-soft">upload_file</span>
                  <span>Import .txt</span>
                </button>
                <button
                  onClick={handleClear}
                  className="px-2 py-1.5 rounded hover:bg-paper-sunk text-ink-soft hover:text-ink font-label-meta text-xs transition-colors cursor-pointer"
                  title="Clear canvas"
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Tactile Manuscript Card */}
            <div className="relative bg-paper-raised rounded-xl p-8 sm:p-10 border border-paper-line shadow-xs">
              {/* Speech Cadence Guide Overlay */}
              <div className="mb-6 p-4 rounded-lg bg-marker-soft flex items-start gap-3 border border-marker-border/40">
                <span className="material-symbols-outlined text-[20px] text-on-tertiary-container mt-0.5 shrink-0">
                  info
                </span>
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-body-sm text-sm font-semibold text-ink">Voice Tracker Cue Active</h2>
                  <p className="font-body-sm text-xs text-on-secondary-container leading-relaxed">
                    Words surrounded by brackets like{' '}
                    <code className="font-label-meta text-[11px] bg-paper-raised px-1 py-0.5 rounded text-ink border border-paper-line">
                      [PAUSE]
                    </code>{' '}
                    will pause automatic scroll recognition until you resume speaking.
                  </p>
                </div>
              </div>

              {/* Script Textarea / Editor Surface */}
              <div className="relative min-h-[460px]">
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={handleContentChange}
                  className="w-full bg-transparent font-body-lg text-lg sm:text-xl text-ink leading-[1.8] resize-none focus:outline-none placeholder:text-ink-faint font-normal font-prompter-reading min-h-[460px]"
                  placeholder="Type or paste your script draft here..."
                  spellCheck="true"
                />
              </div>

              {/* Script Meta Footer Hairline Strip */}
              <div className="mt-8 pt-4 bg-paper-sunk/40 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 px-8 sm:px-10 py-3.5 rounded-b-xl flex flex-wrap items-center justify-between gap-4 border-t border-paper-line/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[16px] text-forest">analytics</span>
                  <span className="font-label-meta text-xs text-ink">
                    <span className="font-bold">{words}</span> words ·{' '}
                    <span className="font-bold">{formattedReadTime}</span> estimated read time
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-forest"></span>
                  <span className="font-label-meta text-xs text-ink-soft">Auto-synced</span>
                </div>
              </div>
            </div>

            {/* Quick Tips Card */}
            {showProTip && (
              <div className="bg-forest-tint rounded-lg p-4 flex items-center justify-between gap-4 border border-forest/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-forest text-[22px] shrink-0">psychology</span>
                  <p className="font-body-sm text-sm text-ink leading-relaxed">
                    <span className="font-semibold text-primary">Pro Delivery Tip:</span> Maintain natural eye movement
                    by placing your laptop or mobile display directly beneath your lens glass.
                  </p>
                </div>
                <button
                  onClick={() => setShowProTip(false)}
                  className="shrink-0 text-ink-soft hover:text-ink cursor-pointer p-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
          </main>

          {/* Right Metarail: Teleprompter Pre-Flight & Configuration */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* Speech Pace Configuration Card */}
            <div className="bg-paper-raised rounded-xl p-6 flex flex-col gap-5 border border-paper-line shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-forest">speed</span>
                  <h2 className="font-title-md text-base sm:text-lg font-semibold text-ink">Pace Calibration</h2>
                </div>
                <span className="font-label-meta text-xs px-2.5 py-0.5 rounded bg-paper-sunk text-ink font-semibold border border-paper-line/50">
                  {pacingWpm} WPM
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-ink-soft font-label-meta text-xs">
                  <span>Conversational</span>
                  <span>Brisk Delivery</span>
                </div>
                <input
                  type="range"
                  min="110"
                  max="210"
                  step="5"
                  value={pacingWpm}
                  onChange={(e) => handlePaceChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-paper-sunk rounded-lg appearance-none cursor-pointer accent-forest focus:outline-none"
                />
                <div className="flex justify-between items-center font-label-meta text-[11px] text-ink-faint mt-1">
                  <span>110 wpm (Narrative)</span>
                  <span>150 (Default)</span>
                  <span>210 (Keynote)</span>
                </div>
              </div>

              {/* Target Take Duration Gauge */}
              <div className="bg-paper-sunk rounded-lg p-4 flex flex-col gap-2.5 border border-paper-line/50">
                <div className="flex items-center justify-between">
                  <span className="font-label-meta text-xs text-ink-soft uppercase tracking-wider">
                    Free Tier Duration
                  </span>
                  <span className="font-label-meta text-xs text-forest font-bold">
                    {formattedReadTime} / 2m 00s
                  </span>
                </div>

                {/* Tactile Meter */}
                <div className="w-full bg-paper-line rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      quotaPercent > 90 ? 'bg-rec' : 'bg-forest'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-ink-soft font-label-meta text-xs pt-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-forest">check_circle</span>
                    Within optimal range
                  </span>
                  <span className="text-ink-faint">Max 2m per take</span>
                </div>
              </div>
            </div>

            {/* Pre-Flight Audio Tester Card */}
            <div className="bg-paper-raised rounded-xl p-6 flex flex-col gap-5 border border-paper-line shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-forest">mic</span>
                  <h2 className="font-title-md text-base sm:text-lg font-semibold text-ink">Microphone Pre-Flight</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 font-label-meta text-[11px] text-forest font-bold bg-forest-tint px-2 py-0.5 rounded">
                  ONLINE
                </span>
              </div>

              <p className="font-body-sm text-xs text-ink-soft leading-relaxed">
                Test speech recognition levels before launching the prompter studio window.
              </p>

              {/* Visual Audio VU Meter Simulation */}
              <div className="bg-paper-sunk rounded-lg p-3.5 flex flex-col gap-2 border border-paper-line/50">
                <div className="flex items-center justify-between font-label-meta text-xs text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-forest animate-pulse"></span>
                    Built-in Mic (Default)
                  </span>
                  <span className="font-bold text-ink">{micDb} dB</span>
                </div>

                {/* Graphic EQ / VU Spectrum Bars */}
                <div className="flex items-end gap-1 h-8 pt-1">
                  {vuHeights.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-xs transition-all duration-150 ${
                        h > 60 ? 'bg-forest' : h > 30 ? 'bg-forest/50' : 'bg-paper-line-strong'
                      }`}
                      style={{ height: `${h}%` }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-forest focus:ring-forest accent-forest cursor-pointer"
                  />
                  <span className="font-body-sm text-xs text-ink group-hover:text-forest transition-colors">
                    Microphone permission granted
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-forest focus:ring-forest accent-forest cursor-pointer"
                  />
                  <span className="font-body-sm text-xs text-ink group-hover:text-forest transition-colors">
                    Speech pacing model pre-cached
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isMirrorInverted}
                    onChange={(e) => setIsMirrorInverted(e.target.checked)}
                    className="w-4 h-4 rounded text-forest focus:ring-forest accent-forest cursor-pointer"
                  />
                  <span className="font-body-sm text-xs text-ink group-hover:text-forest transition-colors">
                    Invert mirroring (for glass teleprompters)
                  </span>
                </label>
              </div>
            </div>

            {/* Secondary Management Actions */}
            <div className="bg-paper-raised rounded-xl p-4 flex flex-col gap-1.5 border border-paper-line shadow-xs">
              <button
                onClick={() => onDuplicateScript(script.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-ink hover:bg-paper-sunk font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-ink-soft">content_copy</span>
                  Duplicate script
                </span>
                <span className="font-label-meta text-[11px] text-ink-faint">Cmd+D</span>
              </button>

              <button
                onClick={exportTextFile}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-ink hover:bg-paper-sunk font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-ink-soft">file_download</span>
                  Export as Plain Text (.txt)
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-faint">download</span>
              </button>

              <div className="h-[1px] bg-paper-line my-1"></div>

              <button
                onClick={() => onDeleteScript(script.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-rec hover:bg-rec-tint font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete script
                </span>
              </button>
            </div>

            {/* Quick Hardware Specs Card */}
            <div className="px-3 py-2 flex items-center justify-between font-label-meta text-xs text-ink-faint">
              <span>Script ID: {script.id}</span>
              <span>UTF-8 · Plain Draft</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
