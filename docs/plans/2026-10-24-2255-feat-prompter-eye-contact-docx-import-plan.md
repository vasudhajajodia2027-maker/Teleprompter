---
title: Prompter Eye Contact and Word Import - Plan
type: feat
date: 2026-10-24
topic: prompter-eye-contact-docx-import
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Prompter Eye Contact and Word Import - Plan

## Goal Capsule

- **Objective:** Someone recording with First Take keeps natural eye contact with their camera while reading, and can bring in a script they wrote in Google Docs or Word without copy-pasting it.
- **Means:** Move the reading line up and centre it under the camera with the preview tucked in the corner (KTD2, KTD3, KTD4), and add `.docx` reading to the existing import paths (KTD1).
- **Product authority:** The app owner. Active scope is the prompter screen, the script editor's import, and My Scripts' import.
- **Stop conditions:** Stop and ask if a change would alter recording behaviour, voice-follow matching, or how scripts are stored.
- **Execution profile:** One implementer, small diffs in existing files plus one new helper module; ships to `main` and deploys through Vercel.
- **Open blockers:** None.

---

## Product Contract

### Summary

The line being read sits high on the screen, centred under the laptop camera, in a column narrow enough that the eyes barely move. The camera preview shrinks to a small corner box that never covers the script, and becomes a pill when the camera is off or on a phone. Import accepts Word files (what Google Docs downloads) next to `.txt` and `.md`. Two labels get clearer: the time-left chip and the language picker, which also picks a sensible default and moves into the bottom toolbar.

### Problem Frame

The reading line sits a third of the way down the screen, and the script column is pushed left to keep 248-312px clear for the camera box (`src/views/LivePrompterView.tsx`, the `sm:pr-[248px] lg:pr-[312px]` padding). At 1024px wide the column's centre is about 150px left of the screen centre. Speakers therefore read down and to the left of a lens that sits top-centre, which shows on camera. Teleprompter guidance is consistent that the text being read should sit as close under the lens as possible in a narrow column (teleprompter.works FAQ, "How do I position the text area").

Separately, most people draft scripts in Google Docs or Word. Import today accepts only `.txt` and `.md` (editor) and `.txt`, `.md`, `.json` (My Scripts), so those users paste instead. The main teleprompter apps import Word documents as standard.

### Requirements

**Eye contact and layout**

- R1. The reading line sits high on the screen: about 15% of the window height from the top, and never under the top bar.
- R2. The script column is horizontally centred on the screen at every width.
- R3. The script column is no wider than its current comfortable line length (28 characters at the chosen font) and no wider than 60% of the screen.
- R4. On screens 640px and wider, a camera preview shown in the top-right corner never overlaps the script text.
- R5. The script column's width does not change when the camera turns on or off, so text never reflows during a take.
- R6. On phones (under 640px wide) there is no floating preview box; a small pill in the top bar shows the camera state and turns the camera on or off.
- R7. When the camera is off, a small "Turn on camera" pill replaces the black preview box.
- R8. The camera on/off control and the hide-preview control on the preview box sit apart, not stacked in one corner.

**Import**

- R9. The script editor's import and My Scripts' import both accept `.docx` files as well as their current types.
- R10. An imported `.docx` keeps its paragraphs, and its formatting becomes plain text.
- R11. Choosing an unsupported file (for example `.doc` or `.pdf`) shows a plain message naming the types that work.
- R12. The import buttons say which types they take, including Word.

**Labels and language**

- R13. The header chip reads "About <time> to go · N% read", or "Finished" at the end, with a tooltip saying it is an estimate at the current pace.
- R14. With no saved language, the speech language defaults to the browser's language when it is English (India), English (US), English (UK) or Hindi, and to English (India) otherwise. A saved choice always wins.
- R15. The speech-language picker lives in the bottom toolbar next to the font controls, not in the top bar, and still appears only in voice-follow mode.

### Key Decisions

- **Text under the lens, preview in the corner.** Governs R1, R2, R4, R6. (session-settled: user-directed — chosen over a small preview at top-centre under the camera: the eye-contact research says the spot under the lens belongs to the line being read)
- **Word import now, PDF later.** Governs R9, R11. (session-settled: user-approved — chosen over adding PDF in this change: text extracted from PDFs often comes out jumbled)

### Scope Boundaries

- Not changed: recording, voice-follow matching, script storage, the editor's own text tools, other pages.
- Not built: drag-and-drop of `.docx` onto the editor (My Scripts' existing drop zone gains `.docx` through R9 for free).

#### Deferred to Follow-Up Work

- PDF import.
- More speech languages.

### Success Criteria

- On a 1280x800 laptop window, the reading line is within about 120px of the top of the screen and the column's centre is within a few pixels of the screen centre.
- A Google Docs file downloaded as `.docx` imports into both the editor and My Scripts with the same paragraphs it had.

### Sources

- teleprompter.works FAQ, "How Do I Position the Text Area in a Teleprompter App?" — place text directly below the camera, narrow column of 50-70% width.
- Teleprompter Pro, Teleprompter for Video, Teleprompter PAD import guides — Word, PDF, `.txt` and `.rtf` are standard import types; PDF extraction quality depends on how the PDF was made.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Read `.docx` with `mammoth`'s raw-text extraction, loaded only on import.** It is the standard browser library for `.docx` to text and returns paragraphs separated by blank lines, which is what the prompter already expects. A dynamic import keeps it out of the main bundle, so the prompter does not load slower. Version 1.13.0 is current. Governs R9, R10. (session-settled: user-approved — chosen over bundling the library up front: it only loads when someone imports a Word file)
- KTD2. **One shared reader for script files.** A new `src/lib/scriptImport.ts` turns a `File` into a title and plain text for `.txt`, `.md` (via the existing `stripMarkdown`) and `.docx`, and rejects other types with a message. Both views call it, so the two import paths stop drifting apart. My Scripts keeps its own `.json` backup branch before calling the shared reader.
- KTD3. **The reading-line position is one measured value.** The guide line's `top`, the column's top padding and `readingGuideY()` all derive from a single position: `max(15vh, bottom of the top bar + 16px)`. The top bar height is already measured for the scroll area (`prompterContainerRef.offsetTop` in the scroll-area effect), so reuse that measurement rather than adding a second observer.
- KTD4. **Symmetric clearance, fixed while the preview is visible.** On 640px and wider the column's max width is the smallest of 28ch, 60vw, and the screen width minus twice the preview's footprint (box width plus its right inset plus a 16px gap). Clearing both sides keeps the column centred. The clearance is the same whether the camera is on or off, so the column never reflows mid-take (R5). (session-settled: user-approved — chosen over letting the column fill 60% on wide screens: very long lines would push the eyes side to side again)
- KTD5. **The preview box gets smaller and sits closer to the edge below `lg`.** 128px wide with a 24px right inset from 640px to 1023px, and 200px with a 48px inset at `lg` and up (down from 200/240 with a 48px inset). Symmetric clearance at the old sizes would leave a 640px-wide window only about 160px of column; these sizes keep it near 300px at 640px, 430px at 768px and 500px at 1024px.
- KTD6. **Phones use a top-bar pill instead of a floating box.** Below 640px the floating box and the floating "Show camera" button are not rendered. The pill toggles the camera and shows when it is live or recording. The hidden `<video>` element stays mounted so recording keeps its stream.

### Implementation Constraints

- The prompter's scroll maths reads the guide position from the DOM (`readingGuideY()`, `guideAbsoluteY`); keep those reading the guide element so they follow KTD3 automatically.
- Speech-language codes stay exactly `en-IN`, `en-US`, `en-GB`, `hi-IN`, and the `ft_prompter_speech_lang` storage key stays the same.

---

## Implementation Units

### U1. Shared script-file reader with Word support

- **Goal:** One helper that reads `.txt`, `.md` and `.docx` into a title and plain text, used by both import paths.
- **Requirements:** R9, R10, R11, R12; KTD1, KTD2.
- **Dependencies:** None.
- **Files:**
  - Create `src/lib/scriptImport.ts`
  - Create `src/lib/scriptImport.test.ts`
  - Modify `src/views/ScriptEditorView.tsx` (import handler, `accept`, button label)
  - Modify `src/views/MyScriptsView.tsx` (upload handler after the `.json` branch, `accept`, type message, button label)
  - Modify `package.json` and `package-lock.json` (add `mammoth`, and `jszip` as a dev dependency so tests can build `.docx` fixtures without relying on a transitive install)
- **Approach:**
  1. The helper picks a reader by extension: text for `.txt`, text plus `stripMarkdown` for `.md`/`.markdown`, `mammoth` raw text from the file's array buffer for `.docx`.
  2. Title comes from the file name without extension, with `-`/`_` turned into spaces, matching My Scripts today.
  3. Unsupported types reject with one message naming `.docx`, `.txt` and `.md`; each view shows it the way it already shows import problems (`alert`).
  4. Collapse runs of three or more newlines in `.docx` output to one blank line, so paragraphs stay single-spaced like typed scripts.
  5. Editor keeps its existing "Replace this script?" confirm and undoable `replaceRange`; My Scripts keeps `onImportScript(title, content)`.
  6. Button labels: editor "Import file" with a tooltip listing `.docx, .txt, .md`; My Scripts' import button names Word alongside text files.
- **Patterns to follow:** `src/lib/scriptText.ts` plus `src/lib/scriptText.test.ts` for a pure helper with vitest coverage.
- **Test scenarios:**
  - A `.txt` file returns its text unchanged and a title from the file name.
  - A `.md` file returns text with Markdown markers stripped (heading `#`, emphasis).
  - A file named `my_pitch-v2.docx` built in the test with two paragraphs returns both paragraphs separated by one blank line and the title "my pitch v2".
  - A `.docx` whose paragraphs are separated by empty paragraphs returns no more than one blank line between them.
  - A `.pdf` file and a `.doc` file each reject with the message naming the supported types.
- **Verification:** Both import buttons accept a real Google Docs `.docx` export and show its paragraphs; `.pdf` shows the message; the main JS bundle does not contain `mammoth` (it builds as a separate chunk).

### U2. Reading line under the lens and corner preview

- **Goal:** The line being read sits high and centred, and the camera preview never covers it.
- **Requirements:** R1-R8; KTD3, KTD4, KTD5, KTD6.
- **Dependencies:** None.
- **Files:**
  - Modify `src/views/LivePrompterView.tsx` (reading guide, scroll container and column classes, preview box, "Show camera" button, top bar)
- **Approach:**
  1. Compute the guide position once per KTD3. Apply it to the guide line's `top` (a viewport position) and set the column's top padding to that position minus the top bar height, because the scroll area starts below the top bar; the first line then starts on the guide. Remove the `33vh` constants.
  2. Remove the `sm:pr-[248px] lg:pr-[312px]` padding and set the column's max width per KTD4, applying the preview clearance only at 640px and up while the preview is shown.
  3. Shrink the box per KTD5. Move the camera on/off control into the box's bottom row beside the mic meter, and keep the hide control top-right.
  4. When the camera is off, render a small "Turn on camera" pill in the corner instead of the black box; keep the `<video>` element mounted.
  5. Below 640px, render the camera pill in the top bar per KTD6 and hide the floating box and floating "Show camera" button.
- **Patterns to follow:** Existing Tailwind breakpoints and night-mode class pairs in the same file; the existing `showCameraPreview` and `useLiveWebcam` state.
- **Test expectation:** none -- layout and styling only; no pure logic changes. Verified in the browser instead.
- **Verification:** At 1280x800, 1024x768 and 768x1024 the column is centred and the reading line is in the top fifth of the screen, with the preview box clear of the text. At 375x812 there is no floating box, the top-bar pill toggles the camera, and the reading line sits just below the top bar. Turning the camera on or off does not move the text. Scrolling, line clicks and voice-follow still land the active line on the guide.

### U3. Time-left chip label

- **Goal:** The chip can't be mistaken for the recording timer.
- **Requirements:** R13.
- **Dependencies:** None.
- **Files:**
  - Modify `src/views/LivePrompterView.tsx` (header progress chip)
- **Approach:** Change the chip text to the R13 wording using the existing `formatTime(remainingSeconds)` and `progressPercent`, and add the tooltip via `title`.
- **Test expectation:** none -- copy change only.
- **Verification:** On a wide screen the chip reads "About 00:50 to go · 12% read" mid-script (the time uses the same `formatTime` as the REC timer) and "Finished" at the end, and hovering shows the estimate tooltip.

### U4. Language picker default and placement

- **Goal:** The speech language is right without touching it for most people, and it stops crowding the top bar.
- **Requirements:** R14, R15.
- **Dependencies:** None.
- **Files:**
  - Create `src/lib/speechLang.ts`
  - Create `src/lib/speechLang.test.ts`
  - Modify `src/views/LivePrompterView.tsx` (initial `speechLang` state, remove the header `<select>`, add it to the bottom dock beside the font style select)
- **Approach:**
  1. A pure helper takes the saved value and the browser's language list and returns the language per R14: saved value if it is one of the four codes, else the first browser language that matches one of the four (`hi` or `hi-*` counts as `hi-IN`; English variants must match exactly), else `en-IN`.
  2. The state initialiser calls the helper with `localStorage` and `navigator.languages`.
  3. Move the `<select>` and its four options into the dock's settings row, styled like the font-style select, still only when `scrollMode === 'voice'`.
- **Patterns to follow:** The font-style `<select>` in the dock for styling; `src/lib/voiceMatch.test.ts` for vitest structure.
- **Test scenarios:**
  - Saved `en-GB` with browser `['hi-IN']` returns `en-GB`.
  - No saved value with browser `['en-US', 'en']` returns `en-US`.
  - No saved value with browser `['hi']` returns `hi-IN`.
  - No saved value with browser `['fr-FR', 'en-AU']` returns `en-IN`.
  - Saved value `xx-YY` (not one of the four) with browser `['en-GB']` returns `en-GB`.
  - Empty browser list and no saved value returns `en-IN`.
- **Verification:** The top bar no longer has the language dropdown. In voice mode the dock shows it next to the font style, and the choice survives a reload.

---

## Verification Contract

| Gate | Command or check | Applies to |
|---|---|---|
| Type check | `npm run lint` (runs `tsc --noEmit`) | All units |
| Unit tests | `npm test` (vitest) | U1, U4 |
| Production build | `npm run build`, then confirm `mammoth` is in its own chunk, not `index-*.js` | U1 |
| Browser check | Dev server via the `first-take-dev` launch config; prompter at 1280x800, 1024x768, 768x1024, 375x812; editor and My Scripts import with a `.docx`, `.txt`, `.md` and `.pdf` | U1-U4 |
| Live check | After pushing to `main`, the deployed bundle on getfirsttake.app contains the new chip wording and the prompter layout matches the browser check | All units |

---

## Definition of Done

- R1-R15 hold, checked against the Verification Contract.
- U1 and U4 tests pass, and the existing suite still passes.
- The type check and production build pass.
- No leftover code from abandoned approaches, and no unused imports or state from the removed header picker or the old camera padding.
- The change is pushed to `main` and confirmed live.
