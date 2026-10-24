// Turns a script file the user picked into a title and plain prompter text.
// Word files (what Google Docs downloads as .docx) are read with mammoth, which
// is loaded only when one is imported so the prompter's own bundle stays small.

import { stripMarkdown } from './scriptText';

export const UNSUPPORTED_FILE_MESSAGE = 'Choose a Word (.docx), .txt or .md file.';

export interface ImportedScript {
  title: string;
  text: string;
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

export async function readScriptFile(file: File): Promise<ImportedScript> {
  const name = file.name.toLowerCase();
  let text: string;
  if (name.endsWith('.txt')) {
    text = await file.text();
  } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
    text = stripMarkdown(await file.text());
  } else if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    // mammoth ends every paragraph with a blank line; empty paragraphs add more.
    text = value.replace(/\n{3,}/g, '\n\n').trim();
  } else {
    throw new Error(UNSUPPORTED_FILE_MESSAGE);
  }
  return { title: titleFromFileName(file.name), text };
}
