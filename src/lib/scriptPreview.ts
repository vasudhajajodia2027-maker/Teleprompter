// The editor's Preview: the script split and styled exactly as the prompter
// shows it (paragraphs on blank lines; [notes] and *stress* via describeWords).

import { describeWords, WordStyle } from './voiceMatch';

export function previewParagraphs(content: string): WordStyle[][] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => describeWords(p.split(/\s+/).filter(Boolean)));
}
