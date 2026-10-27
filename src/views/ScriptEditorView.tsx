import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { nowStamp } from '../lib/scriptTime';
import { formatStoredReadTime, readSeconds, spokenWordCount } from '../lib/scriptText';
import { readScriptFile, UNSUPPORTED_FILE_MESSAGE } from '../lib/scriptImport';
import { Script } from '../types';

interface ScriptEditorViewProps {
  script: Script;
  signedIn: boolean;
  onUpdateScript: (updated: Script) => void;
  onOpenPrompter: (scriptId: string) => void;
  onDuplicateScript: (scriptId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onBackToScripts: () => void;
}

const NOTES_HINT_KEY = 'ft_editor_notes_hint_dismissed';

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  script,
  signedIn,
  onUpdateScript,
  onOpenPrompter,
  onDuplicateScript,
  onDeleteScript,
  onBackToScripts,
}) => {
  const [title, setTitle] = useState(script.title);
  const [content, setContent] = useState(script.content);
  const [pacingWpm, setPacingWpm] = useState(script.pacingWpm || 150);
  const [showNotesHint, setShowNotesHint] = useState(() => {
    try {
      return localStorage.getItem(NOTES_HINT_KEY) !== 'true';
    } catch {
      return true;
    }
  });

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

  // The script box grows with its text, so the page scrolls rather than the box.
  const fitEditorHeight = () => {
    const el = editorRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fitEditorHeight, [content]);
  useEffect(() => {
    window.addEventListener('resize', fitEditorHeight);
    return () => window.removeEventListener('resize', fitEditorHeight);
  }, []);

  // Every change is saved at once: in this browser, and to the account when signed in.
  const triggerUpdate = (newTitle: string, newContent: string, newWpm: number) => {
    onUpdateScript({
      ...script,
      title: newTitle.trim() || 'Untitled',
      content: newContent,
      pacingWpm: newWpm,
      wordCount: spokenWordCount(newContent),
      estimatedReadTime: formatStoredReadTime(readSeconds(newContent, newWpm)),
      updatedAt: nowStamp(),
    });
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

  const dismissNotesHint = () => {
    setShowNotesHint(false);
    try {
      localStorage.setItem(NOTES_HINT_KEY, 'true');
    } catch {
      // Private mode: the hint just comes back next time.
    }
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Lets the same file be chosen again later.
    e.target.value = '';
    if (!file) return;
    let text: string;
    try {
      ({ text } = await readScriptFile(file));
    } catch (err) {
      alert(err instanceof Error && err.message === UNSUPPORTED_FILE_MESSAGE ? err.message : `Couldn’t read “${file.name}”.`);
      return;
    }
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

  const exportTextFile = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.trim() || 'script'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolButton =
    'px-2.5 py-1.5 rounded bg-paper-sunk hover:bg-paper-line text-ink font-label-meta text-xs flex items-center gap-1.5 transition-colors cursor-pointer';
  const barButton =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-sunk font-body-sm text-xs transition-colors cursor-pointer';

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="max-w-[1120px] mx-auto w-full pt-4 space-y-5">
        {/* Header: title, save status, Open prompter */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <button
              onClick={onBackToScripts}
              className="self-start text-ink-soft hover:text-ink flex items-center gap-1 font-label-meta text-xs cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>My Scripts</span>
            </button>
            <input
              aria-label="Script title"
              className="font-headline-md text-xl sm:text-3xl text-ink bg-transparent focus:outline-none focus:bg-paper-sunk/60 rounded px-1 -ml-1 transition-colors w-full font-medium tracking-tight font-display text-ellipsis"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => {
                if (!title.trim()) setTitle('Untitled');
              }}
              placeholder="Untitled"
            />
            <p className="flex items-center gap-1.5 font-label-meta text-xs text-ink-soft">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-forest">
                {signedIn ? 'cloud_done' : 'check_circle'}
              </span>
              {signedIn ? 'Saved to your account' : 'Saved on this device'}
            </p>
          </div>
          <button
            onClick={() => onOpenPrompter(script.id)}
            className="shrink-0 self-start md:self-auto flex items-center gap-2 px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all active:scale-95 shadow-xs cursor-pointer"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">play_arrow</span>
            <span>Open prompter</span>
          </button>
        </section>

        {/* Toolbar */}
        <div className="bg-paper-raised rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 border border-paper-line shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => insertNote('[PAUSE 2s]')}
              className={toolButton}
              title="Insert a [PAUSE 2s] note"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-tertiary">timer</span>
              <span>+ 2s Pause</span>
            </button>
            <button
              onClick={() => insertNote('[CAMERA LOOK]')}
              className={toolButton}
              title="Insert a [CAMERA LOOK] note"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-primary">visibility</span>
              <span>+ Camera look</span>
            </button>
            <button
              onClick={insertStress}
              className={toolButton}
              title="Stress the selected words, or the word at the cursor. Shown in bold in the prompter."
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-ink-soft">format_bold</span>
              <span>Stress</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".docx,.txt,.md" className="hidden" onChange={handleFileImport} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={toolButton}
              title="Import a Word (.docx), .txt or .md file. From Google Docs: File > Download > Microsoft Word."
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-ink-soft">upload_file</span>
              <span>Import Word / text file</span>
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

        {showNotesHint && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-paper-sunk border border-paper-line font-body-sm text-xs text-ink-soft">
            <span>
              Text in <code className="font-label-meta text-[11px] bg-paper-raised px-1 py-0.5 rounded text-ink">[brackets]</code> is a note to
              yourself: it stays on screen in the prompter, and you don’t read it aloud.
            </span>
            <button
              aria-label="Dismiss this hint"
              onClick={dismissNotesHint}
              className="shrink-0 text-ink-soft hover:text-ink cursor-pointer p-0.5"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* The script */}
        <div className="bg-paper-raised rounded-xl border border-paper-line shadow-xs">
          <div className="p-6 sm:p-10">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              className="w-full min-h-[360px] overflow-hidden bg-transparent font-body-lg text-lg sm:text-xl text-ink leading-[1.8] resize-none focus:outline-none placeholder:text-ink-faint font-normal font-prompter-reading"
              placeholder="Type or paste your script here"
              spellCheck="true"
            />
          </div>

          {/* Bottom bar: length, pace and script actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 sm:px-10 py-3 border-t border-paper-line/60 bg-paper-sunk/40 rounded-b-xl">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="font-label-meta text-xs text-ink">
                <span className="font-bold">{words}</span> words · <span className="font-bold">{formattedReadTime}</span>
              </span>
              <label className="flex items-center gap-2 font-label-meta text-xs text-ink-soft" title="Sets the read-time estimate and the auto-scroll speed">
                <span>Pace</span>
                <input
                  type="range"
                  min="110"
                  max="210"
                  step="5"
                  value={pacingWpm}
                  onChange={(e) => handlePaceChange(parseInt(e.target.value, 10))}
                  className="w-28 h-1.5 bg-paper-sunk rounded-lg appearance-none cursor-pointer accent-forest focus:outline-none"
                  aria-label="Reading pace in words per minute"
                />
                <span className="w-16 text-ink font-semibold">{pacingWpm} wpm</span>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onDuplicateScript(script.id)} className={barButton} type="button">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">content_copy</span>
                Duplicate
              </button>
              <button onClick={exportTextFile} className={barButton} type="button">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                Download .txt
              </button>
              <button
                onClick={() => onDeleteScript(script.id)}
                className={`${barButton} hover:text-rec! hover:bg-rec-tint!`}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
