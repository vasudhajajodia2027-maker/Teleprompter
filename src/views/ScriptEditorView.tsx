import React, { useState, useEffect, useRef } from 'react';
import { nowStamp } from '../lib/scriptTime';
import { formatStoredReadTime, readSeconds, spokenWordCount, stripMarkdown } from '../lib/scriptText';
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
  const [saveStatus, setSaveStatus] = useState('Saved just now');
  const [showProTip, setShowProTip] = useState(true);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Spoken words only ([notes] and symbols like # or — aren't read aloud),
  // and the read time includes written pauses such as [PAUSE 2s].
  const words = spokenWordCount(content);
  const formattedReadTime = formatStoredReadTime(readSeconds(content, pacingWpm));

  // Sync state changes with parent
  useEffect(() => {
    setTitle(script.title);
    setContent(script.content);
    setPacingWpm(script.pacingWpm || 150);
  }, [script.id]);

  const triggerUpdate = (newTitle: string, newContent: string, newWpm: number) => {
    setSaveStatus('Saving…');
    const updatedWords = spokenWordCount(newContent);
    const estTime = formatStoredReadTime(readSeconds(newContent, newWpm));

    onUpdateScript({
      ...script,
      title: newTitle.trim() || 'Untitled',
      content: newContent,
      pacingWpm: newWpm,
      wordCount: updatedWords,
      estimatedReadTime: estTime,
      updatedAt: nowStamp(),
    });

    setTimeout(() => {
      setSaveStatus('Saved just now');
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

  // Replace characters [from, to) of the script, then select [selectFrom,
  // selectTo) of the new text. Goes through the browser's own editing command
  // so Ctrl+Z can undo it; React receives it as ordinary typing.
  const replaceRange = (from: number, to: number, text: string, selectFrom = text.length, selectTo = selectFrom) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(from, to);
    let done = false;
    try {
      done = document.execCommand('insertText', false, text);
    } catch {
      done = false;
    }
    if (!done) {
      // Browsers without execCommand: the same edit, without undo.
      el.setRangeText(text, from, to, 'end');
      setContent(el.value);
      triggerUpdate(title, el.value, pacingWpm);
    }
    el.setSelectionRange(from + selectFrom, from + selectTo);
  };

  // A [note] on its own line with one blank line before and after it, and no
  // stray spaces left at the end of the line before or the start of the next.
  const insertNote = (note: string) => {
    const el = editorRef.current;
    if (!el) return;
    const value = el.value;
    let from = el.selectionStart;
    let to = el.selectionEnd;
    while (from > 0 && /[ \t]/.test(value[from - 1])) from--;
    while (to < value.length && /[ \t]/.test(value[to])) to++;
    const before = value.slice(0, from);
    const after = value.slice(to);
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    const text = lead + note + trail;
    // Cursor at the start of the line after the note.
    const blankAfter = after.startsWith('\n\n') ? 2 : after.startsWith('\n') ? 1 : 0;
    replaceRange(from, to, text, text.length + blankAfter);
  };

  // Stress the selected words. With nothing selected, stress the word at the
  // cursor; between words, insert a placeholder and select it to type over.
  const insertStress = () => {
    const el = editorRef.current;
    if (!el) return;
    const value = el.value;
    let from = el.selectionStart;
    let to = el.selectionEnd;
    const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}'’-]/u.test(c);
    if (from === to) {
      while (from > 0 && isWordChar(value[from - 1])) from--;
      while (to < value.length && isWordChar(value[to])) to++;
    }
    if (from === to) {
      const lead = from > 0 && !/\s/.test(value[from - 1]) ? ' ' : '';
      const trail = to < value.length && !/[\s.,!?;:]/.test(value[to]) ? ' ' : '';
      const text = `${lead}*word*${trail}`;
      replaceRange(from, to, text, lead.length + 1, lead.length + 5);
      return;
    }
    // Keep spaces at the edges of the selection outside the stars.
    while (from < to && /\s/.test(value[from])) from++;
    while (to > from && /\s/.test(value[to - 1])) to--;
    replaceRange(from, to, `*${value.slice(from, to)}*`);
  };

  const handleClear = () => {
    const el = editorRef.current;
    if (!el?.value) return;
    if (confirm('Clear the whole script? You can bring it back with Undo (Ctrl+Z).')) {
      replaceRange(0, el.value.length, '');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Lets the same file be chosen again later.
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const raw = (evt.target?.result as string) || '';
      const text = /\.(md|markdown)$/i.test(file.name) ? stripMarkdown(raw) : raw;
      const el = editorRef.current;
      if (!el) return;
      if (
        el.value.trim() &&
        !confirm(`Replace this script with “${file.name}”? You can bring the current text back with Undo (Ctrl+Z).`)
      ) {
        return;
      }
      replaceRange(0, el.value.length, text, 0);
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
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
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
                onBlur={() => {
                  if (!title.trim()) setTitle('Untitled');
                }}
                placeholder="Untitled"
              />
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-forest">check_circle</span>
              <p className="font-label-meta text-xs text-ink-soft">{saveStatus}</p>
            </div>
          </div>

          {/* Primary Control Action */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              onClick={() => alert(`${words} words at ${pacingWpm} words per minute takes about ${formattedReadTime} to read.`)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-paper-raised text-ink font-body-sm text-sm hover:bg-paper-sunk transition-colors border border-paper-line cursor-pointer"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-ink-soft">speed</span>
              <span>Pace Guide</span>
            </button>
            <button
              onClick={() => onOpenPrompter(script.id)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm hover:bg-forest-dark transition-all transform active:scale-95 shadow-xs cursor-pointer font-medium"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">play_arrow</span>
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
                  onClick={() => insertNote('[PAUSE 2s]')}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Insert a [PAUSE 2s] note"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-tertiary">timer</span>
                  <span>+ 2s Pause</span>
                </button>
                <button
                  onClick={() => insertNote('[CAMERA LOOK]')}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Insert a [CAMERA LOOK] note"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                  <span>+ Lens Cue</span>
                </button>
                <button
                  onClick={insertStress}
                  className="px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Stress the selected words, or the word at the cursor. Shown in bold in the prompter."
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-ink-soft">format_italic</span>
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
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-ink-soft">upload_file</span>
                  <span>Import .txt / .md</span>
                </button>
                <button
                  onClick={handleClear}
                  className="px-2 py-1.5 rounded hover:bg-paper-sunk text-ink-soft hover:text-ink font-label-meta text-xs transition-colors cursor-pointer"
                  title="Clear the whole script"
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-on-tertiary-container mt-0.5 shrink-0">
                  info
                </span>
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-body-sm text-sm font-semibold text-ink">Notes to yourself</h2>
                  <p className="font-body-sm text-xs text-on-secondary-container leading-relaxed">
                    Text in brackets like{' '}
                    <code className="font-label-meta text-[11px] bg-paper-raised px-1 py-0.5 rounded text-ink border border-paper-line">
                      [PAUSE]
                    </code>{' '}
                    shows in the prompter as a reminder. You don’t need to read it aloud.
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
                  placeholder="Type or paste your script here"
                  spellCheck="true"
                />
              </div>

              {/* Script Meta Footer Hairline Strip */}
              <div className="mt-8 pt-4 bg-paper-sunk/40 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 px-8 sm:px-10 py-3.5 rounded-b-xl flex flex-wrap items-center justify-between gap-4 border-t border-paper-line/50">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-forest">analytics</span>
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
                  <span aria-hidden="true" className="material-symbols-outlined text-forest text-[22px] shrink-0">psychology</span>
                  <p className="font-body-sm text-sm text-ink leading-relaxed">
                    <span className="font-semibold text-primary">Pro Delivery Tip:</span> Maintain natural eye movement
                    by placing your laptop or mobile display directly beneath your lens glass.
                  </p>
                </div>
                <button aria-label="Close"
                  onClick={() => setShowProTip(false)}
                  className="shrink-0 text-ink-soft hover:text-ink cursor-pointer p-1"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
          </main>

          {/* Right Metarail: reading pace & script actions */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* Speech Pace Configuration Card */}
            <div className="bg-paper-raised rounded-xl p-6 flex flex-col gap-5 border border-paper-line shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-forest">speed</span>
                  <h2 className="font-title-md text-base sm:text-lg font-semibold text-ink">Reading pace</h2>
                </div>
                <span className="font-label-meta text-xs px-2.5 py-0.5 rounded bg-paper-sunk text-ink font-semibold border border-paper-line/50">
                  {pacingWpm} WPM
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-ink-soft font-label-meta text-xs">
                  <span>Sets the read-time estimate and the auto-scroll speed</span>
                  
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

            </div>

            {/* Secondary Management Actions */}
            <div className="bg-paper-raised rounded-xl p-4 flex flex-col gap-1.5 border border-paper-line shadow-xs">
              <button
                onClick={() => onDuplicateScript(script.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-ink hover:bg-paper-sunk font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-ink-soft">content_copy</span>
                  Duplicate script
                </span>
                
              </button>

              <button
                onClick={exportTextFile}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-ink hover:bg-paper-sunk font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-ink-soft">file_download</span>
                  Download as a .txt file
                </span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-ink-faint">download</span>
              </button>

              <div className="h-[1px] bg-paper-line my-1"></div>

              <button
                onClick={() => onDeleteScript(script.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-rec hover:bg-rec-tint font-body-sm text-xs transition-colors text-left cursor-pointer"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                  Delete script
                </span>
              </button>
            </div>

            {/* Quick Hardware Specs Card */}
            <div className="px-3 py-2 flex items-center justify-between font-label-meta text-xs text-ink-faint">
              <span>Script ID: {script.id}</span>
              <span>Plain text</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
