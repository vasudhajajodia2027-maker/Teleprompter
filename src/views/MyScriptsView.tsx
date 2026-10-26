import React, { useState, useRef } from 'react';
import { Script, LicenseStatus } from '../types';
import { formatEdited, formatReadTime } from '../lib/scriptTime';
import { previewText, readSeconds, spokenWordCount } from '../lib/scriptText';
import { readScriptFile, UNSUPPORTED_FILE_MESSAGE } from '../lib/scriptImport';
import { LibrarySort, searchScripts, sortScripts, splitTemplates } from '../lib/scriptLibrary';

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
  onUseTemplate: (templateId: string) => void;
  onRestoreBackup: (backup: unknown) => number;
}

// Search appears once the library is big enough to need it.
const SEARCH_FROM = 6;

export const MyScriptsView: React.FC<MyScriptsViewProps> = ({
  scripts,
  onOpenScriptEditor,
  onOpenPrompter,
  onNewScript,
  onDuplicateScript,
  onDeleteScript,
  onImportScript,
  onExportAllJson,
  onUseTemplate,
  onRestoreBackup,
}) => {
  const [sort, setSort] = useState<LibrarySort>('lastEdited');
  const [query, setQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readTime = (content: string, wpm: number) => formatReadTime(readSeconds(content, wpm || 150));

  const { own, templates } = splitTemplates(scripts);
  const showSearch = own.length >= SEARCH_FROM;
  const visible = sortScripts(showSearch ? searchScripts(own, query) : own, sort);
  const templatesOpen = showTemplates || own.length === 0;

  const handleFileUpload = (file: File) => {
    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        let added = -1;
        try {
          added = onRestoreBackup(JSON.parse(String(e.target?.result || '')));
        } catch {
          added = -1;
        }
        if (added < 0) alert('That file isn’t a First Take backup.');
        else if (added === 0) alert('Every script in that backup is already in your library.');
        else alert(`Restored ${added} ${added === 1 ? 'script' : 'scripts'} from the backup.`);
      };
      reader.readAsText(file);
      return;
    }
    readScriptFile(file)
      .then(({ title, text }) => onImportScript(title, text))
      .catch((err) =>
        alert(
          err instanceof Error && err.message === UNSUPPORTED_FILE_MESSAGE
            ? 'Choose a Word (.docx), .txt or .md file, or a First Take backup (.json).'
            : `Couldn’t import “${file.name}”.`
        )
      );
  };

  // A file dropped anywhere on the page is imported.
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const iconButton =
    'w-9 h-9 rounded-lg bg-paper-sunk hover:bg-paper-line text-ink-soft hover:text-ink flex items-center justify-center transition-colors cursor-pointer';

  return (
    // Fills the content area so a file dropped anywhere below the cards still lands here.
    <div
      className="flex flex-col w-full relative min-h-[calc(100vh-5rem)]"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // Leaving for a child element is still on the page; leaving the page is not.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 md:left-64 z-30 pointer-events-none flex items-center justify-center bg-forest-tint/40 border-4 border-dashed border-forest/60">
          <p className="px-5 py-3 rounded-xl bg-paper-raised shadow-lg font-title-md text-base text-ink">
            Drop to import (Word, .txt, .md or a backup)
          </p>
        </div>
      )}

      <div className="max-w-[1120px] mx-auto w-full py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-headline-lg text-3xl sm:text-4xl text-ink font-medium tracking-tight font-display">
              My <span className="marker-stroke italic">Scripts</span>
            </h1>
            <p className="font-label-meta text-xs text-ink-soft">
              {own.length} {own.length === 1 ? 'script' : 'scripts'} saved
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.md,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handleFileUpload(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-lg bg-paper-raised text-ink font-body-sm text-sm font-medium hover:bg-paper-sunk transition-colors border border-paper-line flex items-center gap-2 cursor-pointer"
              title="Import a Word (.docx), .txt or .md file, or restore a First Take backup (.json). You can also drop a file anywhere on this page."
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import</span>
            </button>
            <button
              onClick={onNewScript}
              className="px-5 py-2.5 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
              <span>New script</span>
            </button>
          </div>
        </header>

        {own.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {showSearch ? (
              <label className="relative w-full sm:max-w-xs">
                <span className="sr-only">Search scripts</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-ink-faint absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles and text"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-paper-raised border border-paper-line font-body-sm text-sm text-ink placeholder:text-ink-faint outline-none focus:border-forest"
                />
              </label>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1 font-label-meta text-xs" role="group" aria-label="Sort scripts">
              <span className="text-ink-faint mr-1">Sort:</span>
              {(
                [
                  ['lastEdited', 'Last edited'],
                  ['az', 'A–Z'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  aria-pressed={sort === value}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    sort === value ? 'bg-paper-sunk text-ink font-semibold' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {own.length === 0 ? (
          <div className="bg-paper-raised rounded-xl p-8 border border-paper-line text-center space-y-2">
            <h3 className="font-title-md text-lg text-ink font-semibold">No scripts yet</h3>
            <p className="font-body-sm text-sm text-ink-soft">
              Write a new script, import one from Word or a text file, or start from a template below.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="font-body-sm text-sm text-ink-soft py-6 text-center">No scripts match “{query.trim()}”.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map((script) => (
              <article
                key={script.id}
                className="bg-paper-raised rounded-xl p-5 shadow-xs border border-paper-line flex flex-col justify-between gap-5 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-label-meta text-xs text-ink-soft">
                    {formatEdited(script.updatedAt) && (
                      <>
                        <span>{formatEdited(script.updatedAt)}</span>
                        <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                      </>
                    )}
                    <span>{spokenWordCount(script.content)} words</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-paper-line-strong"></span>
                    <span>~{readTime(script.content, script.pacingWpm)}</span>
                  </div>
                  <h3 className="font-title-md text-lg text-ink font-semibold tracking-tight line-clamp-2">{script.title}</h3>
                  <p className="font-body-sm text-sm text-ink-soft line-clamp-3 leading-relaxed">
                    {previewText(script.content, 160)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-paper-line/50">
                  <button
                    onClick={() => onOpenPrompter(script.id)}
                    className="h-9 pl-3 pr-4 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs cursor-pointer active:scale-98"
                    aria-label={`Open ${script.title} in the prompter`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Open prompter</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenScriptEditor(script.id)}
                      className={iconButton}
                      title="Edit"
                      aria-label={`Edit ${script.title}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => onDuplicateScript(script.id)}
                      className={iconButton}
                      title="Duplicate"
                      aria-label={`Duplicate ${script.title}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                    <button
                      onClick={() => onDeleteScript(script.id)}
                      className={`${iconButton} hover:bg-rec-tint! hover:text-rec!`}
                      title="Delete"
                      aria-label={`Delete ${script.title}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {templates.length > 0 && (
          <section className="space-y-4">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              aria-expanded={templatesOpen}
              className="flex items-center gap-1.5 font-title-md text-base text-ink font-semibold hover:text-forest cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                {templatesOpen ? 'expand_less' : 'expand_more'}
              </span>
              Start from a template
              <span className="font-label-meta text-xs text-ink-faint font-normal">({templates.length})</span>
            </button>
            {templatesOpen && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="bg-paper-sunk rounded-xl p-5 border border-paper-line flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <h3 className="font-title-md text-base text-ink font-semibold">{template.title}</h3>
                      <p className="font-body-sm text-sm text-ink-soft line-clamp-2 leading-relaxed">
                        {previewText(template.content, 120)}
                      </p>
                    </div>
                    <button
                      onClick={() => onUseTemplate(template.id)}
                      className="self-start text-ink font-body-sm text-sm hover:text-forest flex items-center gap-1 font-medium cursor-pointer"
                    >
                      Start a script from this
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-paper-line">
          <p className="font-body-sm text-xs text-ink-soft">
            Scripts are saved in this browser, and to your account when you’re signed in.
          </p>
          <button
            onClick={onExportAllJson}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-paper-raised text-ink hover:bg-paper-sunk font-label-meta text-xs font-medium transition-colors flex items-center gap-1.5 border border-paper-line cursor-pointer"
            title="Download all your scripts as a backup file you can import later"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">download</span>
            <span>Download backup</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
