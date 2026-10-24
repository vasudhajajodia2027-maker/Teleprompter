import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { readScriptFile, UNSUPPORTED_FILE_MESSAGE } from './scriptImport';

// The app bundles mammoth's browser build (Vite follows its "browser" field),
// which reads an arrayBuffer. Node would otherwise load the path/buffer build.
const MAMMOTH_BROWSER_BUILD = 'mammoth/mammoth.browser.js';
vi.mock('mammoth', async () => {
  const browser = await import(/* @vite-ignore */ MAMMOTH_BROWSER_BUILD);
  return { ...browser, default: browser.default ?? browser };
});

// The smallest Word file mammoth will read: one document part, one paragraph per entry.
async function docxFile(name: string, paragraphs: string[]): Promise<File> {
  const body = paragraphs
    .map((p) => (p ? `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>` : '<w:p/>'))
    .join('');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`
  );
  const bytes = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([bytes], name);
}

describe('readScriptFile', () => {
  it('reads a .txt file as is, with a title from the file name', async () => {
    const result = await readScriptFile(new File(['Hello there.\n\nSecond line.'], 'opening_take.txt'));
    expect(result).toEqual({ title: 'opening take', text: 'Hello there.\n\nSecond line.' });
  });

  it('strips Markdown marks from a .md file', async () => {
    const result = await readScriptFile(new File(['# Intro\n\nThis is **key**.'], 'intro.md'));
    expect(result.text).toBe('Intro\n\nThis is *key*.');
  });

  it('reads the paragraphs of a .docx file, one blank line apart', async () => {
    const file = await docxFile('my_pitch-v2.docx', ['First paragraph.', 'Second paragraph.']);
    expect(await readScriptFile(file)).toEqual({
      title: 'my pitch v2',
      text: 'First paragraph.\n\nSecond paragraph.',
    });
  });

  it('keeps no more than one blank line where the .docx had empty paragraphs', async () => {
    const file = await docxFile('gaps.docx', ['One.', '', '', 'Two.']);
    expect((await readScriptFile(file)).text).toBe('One.\n\nTwo.');
  });

  it.each(['notes.pdf', 'old.doc'])('rejects %s with the supported types', async (name) => {
    await expect(readScriptFile(new File(['x'], name))).rejects.toThrow(UNSUPPORTED_FILE_MESSAGE);
  });
});
