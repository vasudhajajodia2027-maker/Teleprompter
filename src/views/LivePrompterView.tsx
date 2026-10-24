/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { Script } from '../types';
import { buildSpeechTokens, advanceSpeechPosition, tailTokensFromResults, describeWords } from '../lib/voiceMatch';
import { createVoiceActivityDetector } from '../lib/voiceActivity';

// Speech Recognition interfaces for Web Speech API
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: any) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitAudioContext?: typeof AudioContext;
  }
}

interface PrompterTake {
  id: string;
  takeNumber: number;
  durationSec: number;
  blob: Blob;
  url: string;
  mimeType: string;
  audioOnly: boolean; // recorded without a camera
  createdAt: string;
  isDownloaded: boolean;
}

interface ScriptWord {
  globalIndex: number;
  paragraphIndex: number;
  wordInPara: number;
  original: string;
  display: string;
  emphasis: boolean;
  cue: boolean;
}

interface LivePrompterViewProps {
  script: Script;
  onExit: () => void;
  isPro?: boolean;
}

// Script text size: 24-96 px, changed in steps big enough to see.
const FONT_MIN = 24;
const FONT_MAX = 96;
const FONT_STEP = 4;
const clampFontSize = (px: number) =>
  Number.isFinite(px) ? Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(px))) : 44;

const TEXT_STYLES = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'bold', label: 'Bold' },
] as const;

type ParagraphStatus = 'active' | 'past' | 'next' | 'upcoming';

interface ScriptParagraphProps {
  words: ScriptWord[];
  paraIdx: number;
  status: ParagraphStatus;
  // Next word to say. Only the active paragraph receives the live value;
  // others get a constant, so their props stay equal while the speaker
  // reads and React skips re-rendering them.
  currentWordIndex: number;
  isNightMode: boolean;
  dimSpoken: boolean;
  onLineClick: (paraIdx: number) => void;
  footer: React.ReactNode;
}

const ScriptParagraph = React.memo(function ScriptParagraph({
  words,
  paraIdx,
  status,
  currentWordIndex,
  isNightMode,
  dimSpoken,
  onLineClick,
  footer,
}: ScriptParagraphProps) {
  const isActive = status === 'active';
  return (
    <div
      id={`prompter-para-${paraIdx}`}
      onClick={() => onLineClick(paraIdx)}
      className={`relative px-4 py-3 rounded-xl transition-[background-color,color,opacity,box-shadow] duration-300 cursor-pointer ${
        isActive
          ? isNightMode
            ? 'bg-[#2A2724] border-l-4 border-forest shadow-lg scale-[1.01]'
            : 'bg-marker border-l-4 border-forest shadow-md scale-[1.01]'
          : status === 'past'
          ? isNightMode
            ? 'text-[#6B665C] opacity-40 hover:opacity-75'
            : 'text-ink-faint opacity-45 hover:opacity-80'
          : status === 'next'
          ? isNightMode
            ? 'text-[#FAF7F0] opacity-90'
            : 'text-ink opacity-90'
          : isNightMode
          ? 'text-[#A39E92] opacity-60 hover:opacity-90'
          : 'text-ink-soft opacity-65 hover:opacity-90'
      }`}
    >
      {isActive && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center text-forest">
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">arrow_right</span>
        </div>
      )}

      <p className={`${isActive ? (isNightMode ? 'text-[#FAF7F0] font-medium' : 'text-ink font-medium') : ''}`}>
        {words.map((wordObj) => {
          const isWordSpoken = wordObj.globalIndex < currentWordIndex;
          const isWordActive = wordObj.globalIndex === currentWordIndex;
          return (
            <span
              key={wordObj.globalIndex}
              id={`ft-word-${wordObj.globalIndex}`}
              className={`inline-block mr-[0.28em] transition-colors duration-150 ${
                wordObj.cue
                  ? 'text-[0.5em] align-middle font-label-meta uppercase tracking-wider text-forest opacity-80'
                  : wordObj.emphasis
                  ? 'font-bold'
                  : ''
              } ${
                isWordActive && !wordObj.cue && /[\p{L}\p{N}]/u.test(wordObj.display)
                  ? 'underline decoration-forest decoration-2 font-bold'
                  : isWordSpoken && dimSpoken
                  ? 'opacity-60'
                  : ''
              }`}
            >
              {wordObj.display}
            </span>
          );
        })}
      </p>

      {isActive && footer}
    </div>
  );
});

// Checked once, before anything is recorded. Without a recognizer (Firefox,
// Safari on some systems) voice follow can't track words, so the prompter
// starts in fixed-speed auto-scroll and says which browsers can.
const SPEECH_RECOGNITION_SUPPORTED =
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Speech recognition watchdog: checked every WATCHDOG_MS. A recognizer that
// returns no words during DEAF_AFTER_MS of detected speech is replaced, and so
// is one whose unfinished result reaches LONG_RESULT_WORDS (at the next pause)
// or MAX_RESULT_WORDS (at once).
const WATCHDOG_MS = 500;
const DEAF_AFTER_MS = 6000;
const LONG_RESULT_WORDS = 40;
const MAX_RESULT_WORDS = 90;

const MIC_BLOCKED_NOTICE =
  'Your microphone is blocked, so the script can’t follow your voice. Allow the mic for this site, or switch to steady auto-scroll.';

export const LivePrompterView: React.FC<LivePrompterViewProps> = ({
  script,
  onExit,
}) => {
  // 1. Settings state (persisted to localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_fontsize');
      if (saved) return clampFontSize(parseInt(saved, 10));
    } catch (e) {
      console.warn(e);
    }
    return 44;
  });

  // Text style for the script: serif (Literata), sans (Inter), or bold sans.
  const [textStyle, setTextStyle] = useState<'serif' | 'sans' | 'bold'>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_textstyle');
      if (saved === 'serif' || saved === 'sans' || saved === 'bold') return saved;
    } catch (e) {
      console.warn(e);
    }
    return 'serif';
  });
  useEffect(() => {
    try {
      localStorage.setItem('ft_prompter_textstyle', textStyle);
    } catch (e) {
      console.warn(e);
    }
  }, [textStyle]);
  const nextTextStyle = (s: 'serif' | 'sans' | 'bold') => (s === 'serif' ? 'sans' : s === 'sans' ? 'bold' : 'serif');

  const [baseWpm, setBaseWpm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_wpm');
      if (saved) return Math.min(220, Math.max(80, parseInt(saved, 10)));
    } catch (e) {
      console.warn(e);
    }
    return script.pacingWpm && script.pacingWpm >= 80 && script.pacingWpm <= 220
      ? script.pacingWpm
      : 140;
  });

  const [speedLevel, setSpeedLevel] = useState<'1' | '2' | '3'>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_speed_level');
      if (saved === '1' || saved === '2' || saved === '3') return saved;
    } catch (e) {
      console.warn(e);
    }
    return '2';
  });

  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_nightmode');
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.warn(e);
    }
    return false;
  });

  const [isMirrored, setIsMirrored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_mirrored');
      if (saved !== null) return saved === 'true';
    } catch (e) {
      console.warn(e);
    }
    return false;
  });

  const [scrollMode, setScrollMode] = useState<'voice' | 'auto'>(() => {
    if (!SPEECH_RECOGNITION_SUPPORTED) return 'auto';
    try {
      const saved = localStorage.getItem('ft_prompter_mode');
      if (saved === 'voice' || saved === 'auto') return saved;
    } catch (e) {
      console.warn(e);
    }
    return 'voice';
  });

  // Language / accent selector with English (India) en-IN as DEFAULT
  const [speechLang, setSpeechLang] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_speech_lang');
      if (saved) return saved;
    } catch (e) {
      console.warn(e);
    }
    return 'en-IN';
  });

  // 2. Playback & Prompter state
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false); // Start pressed since the last Start over
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [takes, setTakes] = useState<PrompterTake[]>([]);

  // Camera & preview state
  const [useLiveWebcam, setUseLiveWebcam] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Voice tracking & Audio RMS telemetry state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [showUnsupportedBanner, setShowUnsupportedBanner] = useState<boolean>(!SPEECH_RECOGNITION_SUPPORTED);
  const [micBlocked, setMicBlocked] = useState<boolean>(false);
  const [lastRecognizedPhrase, setLastRecognizedPhrase] = useState<string>('');
  const [micVisualLevels, setMicVisualLevels] = useState<number[]>([0.1, 0.1, 0.1, 0.1, 0.1]);

  // Dynamic pacing / blended WPM learned from speaker pace
  const [dynamicWpm, setDynamicWpm] = useState<number>(baseWpm);

  // Countdown overlay
  const [countdown, setCountdown] = useState<number | null>(null);

  // Modals
  const [showTakesModal, setShowTakesModal] = useState<boolean>(false);
  const [previewTake, setPreviewTake] = useState<PrompterTake | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Refs
  const prompterContainerRef = useRef<HTMLDivElement>(null);
  const scriptContentRef = useRef<HTMLDivElement>(null);

  // The script area ends above the bottom toolbar, so no line is hidden under
  // it. Measured, since the toolbar wraps onto two rows on narrow windows.
  const dockRef = useRef<HTMLDivElement>(null);
  const [scrollAreaHeight, setScrollAreaHeight] = useState<number | null>(null);
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || typeof ResizeObserver === 'undefined') return;
    // Window height minus the top bar above the script area, the toolbar, its
    // 24px offset from the bottom (bottom-6) and an 8px gap. offsetHeight
    // ignores the toolbar's entrance animation transform.
    const measure = () => {
      const top = prompterContainerRef.current?.offsetTop ?? 0;
      setScrollAreaHeight(Math.max(200, window.innerHeight - top - dock.offsetHeight - 24 - 8));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    observer.observe(document.documentElement);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Where the reading guide line is, measured from the top of the visible
  // script area (which starts below the top bar).
  const guideRef = useRef<HTMLDivElement>(null);
  const readingGuideY = () => {
    const guide = guideRef.current?.getBoundingClientRect().top ?? window.innerHeight * 0.33;
    return guide - (prompterContainerRef.current?.getBoundingClientRect().top ?? 0);
  };

  // The camera preview can be tucked away; while shown, the script keeps
  // clear of it on the right.
  const [showCameraPreview, setShowCameraPreview] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastRafTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  // Read at stop time; state values captured when recording began would be stale.
  const recordStartTimeRef = useRef<number>(0);
  const takeCounterRef = useRef<number>(0);

  // Web Audio API refs for hybrid volume-based scrolling
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);

  // Voice activity (speaking / not speaking) from microphone loudness.
  const voiceDetectorRef = useRef(createVoiceActivityDetector());
  // Bumped by every audio cleanup, so a microphone start that finishes after a
  // Pause (or a newer start) knows it is stale and releases what it opened.
  const audioInitGenRef = useRef<number>(0);
  const lastMeterUpdateRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  // Read by the animation loop each frame; a dependency would restart the
  // microphone listener every time the measured reading pace changes.
  const effectiveWpmRef = useRef<number>(0);
  const scrollVelocityMultiplierRef = useRef<number>(0); // 0 (silent) to 1 (full speed)
  const driftCorrectionFactorRef = useRef<number>(1.0); // 0.5 to 1.6
  const targetWordIndexRef = useRef<number>(0);

  // Pacing history for learning words per minute over the last 15 seconds
  const paceHistoryRef = useRef<{ time: number; wordIndex: number }[]>([]);

  // Word tracking: position in the spoken-form token list, and whether the
  // speech recognizer is currently driving the scroll (else volume does).
  const speechPosRef = useRef<number>(0);
  const wordTrackingRef = useRef<boolean>(false);

  // State mirrors for RAF loops and event handlers
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isRecordingRef = useRef<boolean>(isRecording);
  isRecordingRef.current = isRecording;

  const scrollModeRef = useRef<'voice' | 'auto'>(scrollMode);
  scrollModeRef.current = scrollMode;

  const currentWordIndexRef = useRef<number>(currentWordIndex);
  currentWordIndexRef.current = currentWordIndex;

  const activeLineIndexRef = useRef<number>(activeLineIndex);
  activeLineIndexRef.current = activeLineIndex;

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ft_prompter_fontsize', fontSize.toString());
      localStorage.setItem('ft_prompter_wpm', baseWpm.toString());
      localStorage.setItem('ft_prompter_speed_level', speedLevel);
      localStorage.setItem('ft_prompter_nightmode', isNightMode.toString());
      localStorage.setItem('ft_prompter_mirrored', isMirrored.toString());
      localStorage.setItem('ft_prompter_mode', scrollMode);
      localStorage.setItem('ft_prompter_speech_lang', speechLang);
    } catch (e) {
      console.warn('Failed to save prompter settings:', e);
    }
  }, [fontSize, baseWpm, speedLevel, isNightMode, isMirrored, scrollMode, speechLang]);

  // Synchronize webcam element source
  useEffect(() => {
    if (useLiveWebcam && webcamStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== webcamStreamRef.current) {
        videoRef.current.srcObject = webcamStreamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video element play() note:', err);
      });
    }
  }, [useLiveWebcam]);

  // Speed multiplier & effective WPM
  const speedMultiplier = speedLevel === '1' ? 0.75 : speedLevel === '2' ? 1.0 : 1.35;
  const effectiveWpm = scrollMode === 'voice' ? dynamicWpm : Math.round(baseWpm * speedMultiplier);
  effectiveWpmRef.current = effectiveWpm;

  // Tokenize paragraphs & words from script
  const paragraphs = useMemo(() => {
    const raw = script.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (raw.length > 0) return raw;

    return [
      "Welcome everyone. Today we are exploring the exact discipline behind speaking with authority on video.",
      "Most people believe you need years of stage training to hold an audience completely still.",
      "The secret to natural eye contact isn't memorising every sentence.",
      "It's having your thoughts anchored just two inches below the camera glass.",
      "When your posture stays tall and your breath slows down, the teleprompter stops feeling like a mechanical barrier.",
      "Instead, it becomes an invisible mirror for your own authentic conviction.",
      "Pause right here. Let that sink in. Notice how the room gets quiet when you aren't rushing to fill space.",
      "Take a deliberate sip of water if you need it. We will carry this momentum directly into chapter two."
    ];
  }, [script.content]);

  // Flattened token list
  const tokenizedWords = useMemo<ScriptWord[]>(() => {
    const list: ScriptWord[] = [];
    let globalIdx = 0;

    paragraphs.forEach((para, paraIdx) => {
      const wordsInPara = para.split(/\s+/).filter(Boolean);
      const styles = describeWords(wordsInPara);
      wordsInPara.forEach((word, wordIdx) => {
        list.push({
          globalIndex: globalIdx++,
          paragraphIndex: paraIdx,
          wordInPara: wordIdx,
          original: word,
          ...styles[wordIdx],
        });
      });
    });

    return list;
  }, [paragraphs]);

  const totalWords = tokenizedWords.length || 1;

  const speechTokens = useMemo(
    () => buildSpeechTokens(tokenizedWords.map((w) => w.original)),
    [tokenizedWords]
  );

  // Where the scroll should anchor: the current word, or — once only the last
  // few words of a line are left — the first spoken word of the next line, so
  // the next line is already waiting at the reading guide.
  const LINE_END_LOOKAHEAD = 3;
  const scrollAnchorWordRef = useRef<number>(0);
  {
    const cur = Math.min(currentWordIndex, tokenizedWords.length - 1);
    const para = tokenizedWords[cur]?.paragraphIndex ?? 0;
    let lastInPara = cur;
    while (tokenizedWords[lastInPara + 1]?.paragraphIndex === para) lastInPara++;
    const wordsLeft = speechTokens.filter((t) => t.wordIndex >= cur && t.wordIndex <= lastInPara).length;
    const nextLineStart = speechTokens.find((t) => t.wordIndex > lastInPara)?.wordIndex;
    scrollAnchorWordRef.current =
      wordsLeft <= LINE_END_LOOKAHEAD && nextLineStart !== undefined ? nextLineStart : cur;
  }

  // Point word tracking at a displayed word (manual jump or restart).
  const syncSpeechPosToWord = useCallback(
    (wordIndex: number) => {
      const idx = speechTokens.findIndex((t) => t.wordIndex >= wordIndex);
      speechPosRef.current = idx === -1 ? speechTokens.length : idx;
    },
    [speechTokens]
  );

  // Format mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingWords = Math.max(0, totalWords - currentWordIndex);
  const remainingSeconds = Math.round((remainingWords / Math.max(1, effectiveWpm)) * 60);
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentWordIndex / totalWords) * 100)));

  // Scroll active line / word update from scroll position
  const updateActiveLineFromScroll = useCallback(() => {
    const container = prompterContainerRef.current;
    if (!container) return;
    // While words are being tracked, the spoken position decides the line.
    if (scrollModeRef.current === 'voice' && wordTrackingRef.current) return;

    const guideViewportY = readingGuideY();
    const guideAbsoluteY = container.scrollTop + guideViewportY;

    let foundIdx = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const el = document.getElementById(`prompter-para-${i}`);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (guideAbsoluteY >= top && guideAbsoluteY <= bottom) {
          foundIdx = i;
          break;
        } else if (guideAbsoluteY < top) {
          foundIdx = Math.max(0, i - 1);
          break;
        } else {
          foundIdx = i;
        }
      }
    }

    setActiveLineIndex(foundIdx);

    // Keep currentWordIndex aligned with whatever word crosses the guide
    const wordsInFound = tokenizedWords.filter((w) => w.paragraphIndex === foundIdx);
    if (wordsInFound.length > 0) {
      // Pick word closest to guide
      let bestWord = wordsInFound[0];
      let minDistance = 99999;
      for (const w of wordsInFound) {
        const wEl = document.getElementById(`ft-word-${w.globalIndex}`);
        if (wEl) {
          const dist = Math.abs(wEl.offsetTop - guideAbsoluteY);
          if (dist < minDistance) {
            minDistance = dist;
            bestWord = w;
          }
        }
      }
      if (bestWord.globalIndex > currentWordIndexRef.current) {
        setCurrentWordIndex(bestWord.globalIndex);
      }
    }
  }, [paragraphs.length, tokenizedWords]);

  // Clean up Web Audio API resources
  const cleanupWebAudio = useCallback(() => {
    audioInitGenRef.current += 1; // any microphone start still in flight is now stale
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    audioDataRef.current = null;
  }, []);

  // Initialize Web Audio API pipeline for mic stream
  const initWebAudio = useCallback(async () => {
    cleanupWebAudio();
    const gen = audioInitGenRef.current;

    let stream = webcamStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0 || stream.getAudioTracks().every(t => t.readyState === 'ended')) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (gen !== audioInitGenRef.current) {
          // Paused (or restarted) while the browser was opening the mic.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        webcamStreamRef.current = stream;
        setMicBlocked(false);
      } catch (err) {
        console.warn('Microphone stream error for Web Audio:', err);
        setMicBlocked(true);
        setVoiceNotice(MIC_BLOCKED_NOTICE);
        return;
      }
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.warn);
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      audioDataRef.current = new Float32Array(analyser.fftSize);

      // Learn this room's quiet level again for the new listening session.
      voiceDetectorRef.current.reset();
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }, [cleanupWebAudio]);

  // -------------------------------------------------------------
  // 1. HYBRID CONTINUOUS SCROLLING LOOP (Web Audio RMS + RAF)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isPaused) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastRafTimeRef.current = null;
      scrollVelocityMultiplierRef.current = 0;
      setIsSpeaking(false);
      setMicVisualLevels([0.05, 0.05, 0.05, 0.05, 0.05]);
      cleanupWebAudio();
      return;
    }

    // Initialize Web Audio when unpaused in voice mode
    if (scrollMode === 'voice') {
      initWebAudio();
    }

    const step = (time: number) => {
      if (lastRafTimeRef.current === null) {
        lastRafTimeRef.current = time;
      }
      const deltaSec = (time - lastRafTimeRef.current) / 1000;
      lastRafTimeRef.current = time;

      const container = prompterContainerRef.current;
      const content = scriptContentRef.current;

      // Handle Voice Mode with Web Audio RMS & Hybrid continuous scroll
      if (scrollMode === 'voice') {
        const analyser = analyserRef.current;
        const audioBuffer = audioDataRef.current;

        let rawRms = 0;
        if (analyser && audioBuffer) {
          analyser.getFloatTimeDomainData(audioBuffer as any);
          let sumSquares = 0;
          for (let i = 0; i < audioBuffer.length; i++) {
            sumSquares += audioBuffer[i] * audioBuffer[i];
          }
          rawRms = Math.sqrt(sumSquares / audioBuffer.length);
        }

        // Speaking / not speaking (room level, 150 ms attack, 600 ms release):
        // see src/lib/voiceActivity.ts.
        const isNowSpeaking = analyser && audioBuffer ? voiceDetectorRef.current.update(rawRms, time).speaking : false;
        if (isNowSpeaking !== isSpeakingRef.current) {
          isSpeakingRef.current = isNowSpeaking;
          setIsSpeaking(isNowSpeaking);
        }

        // Mic meter: about 10 updates a second is enough to read, and avoids
        // re-rendering the whole studio every animation frame.
        if (time - lastMeterUpdateRef.current >= 100) {
          lastMeterUpdateRef.current = time;
          const scaledRms = Math.min(1, rawRms * 8);
          setMicVisualLevels([
            Math.min(1, scaledRms * 1.5 + 0.05),
            Math.min(1, scaledRms * 2.2 + 0.05),
            Math.min(1, scaledRms * 3.0 + 0.05),
            Math.min(1, scaledRms * 2.0 + 0.05),
            Math.min(1, scaledRms * 1.2 + 0.05),
          ]);
        }

        // Easing: while speaking ramp to 1.0; when silent ease to 0 within 300ms
        if (isNowSpeaking) {
          scrollVelocityMultiplierRef.current = Math.min(
            1.0,
            scrollVelocityMultiplierRef.current + deltaSec / 0.15
          );
        } else {
          scrollVelocityMultiplierRef.current = Math.max(
            0,
            scrollVelocityMultiplierRef.current - deltaSec / 0.3
          );
        }

        // 2. Position Drift Correction: speed up up to 1.6x if match is ahead; slow to 0.5x if scroll is >12 words ahead
        const curWord = currentWordIndexRef.current;
        const targetWord = targetWordIndexRef.current;

        if (targetWord > curWord) {
          const lead = targetWord - curWord;
          driftCorrectionFactorRef.current = Math.min(1.6, 1.0 + lead * 0.08);
        } else if (curWord - targetWord > 12) {
          driftCorrectionFactorRef.current = 0.5;
        } else {
          driftCorrectionFactorRef.current = 1.0;
        }

        if (wordTrackingRef.current && container) {
          // Words are being recognized: glide so the line being read sits on
          // the reading guide, leaving the following lines visible below it.
          const wordEl = document.getElementById(`ft-word-${scrollAnchorWordRef.current}`);
          if (wordEl) {
            const guideY = readingGuideY();
            const offset =
              wordEl.getBoundingClientRect().top - container.getBoundingClientRect().top - guideY;
            if (Math.abs(offset) > 1) {
              container.scrollTop += offset * Math.min(1, deltaSec * 12);
            }
          }
        } else if (container && content && scrollVelocityMultiplierRef.current > 0.01) {
          // No word recognition available: follow the loudness of the voice.
          const renderedHeight = content.scrollHeight || 1000;
          const pixelsPerWord = renderedHeight / totalWords;
          const pixelsPerSecond =
            pixelsPerWord *
            (effectiveWpmRef.current / 60) *
            scrollVelocityMultiplierRef.current *
            driftCorrectionFactorRef.current;

          container.scrollTop += pixelsPerSecond * deltaSec;
          updateActiveLineFromScroll();
        }
      } else if (scrollMode === 'auto') {
        // Auto scroll mode at constant WPM
        if (container && content) {
          const renderedHeight = content.scrollHeight || 1000;
          const pixelsPerWord = renderedHeight / totalWords;
          const pixelsPerSecond = pixelsPerWord * (effectiveWpmRef.current / 60);

          container.scrollTop += pixelsPerSecond * deltaSec;
          updateActiveLineFromScroll();

          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 20) {
            setIsPaused(true);
            return;
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      cleanupWebAudio();
    };
  }, [
    isPaused,
    scrollMode,
    totalWords,
    updateActiveLineFromScroll,
    initWebAudio,
    cleanupWebAudio,
  ]);

  // Scroll a specific line or word so it sits on the reading guide
  // Words grouped by paragraph once per script (the old render filtered the
  // whole word list for every paragraph on every update).
  const wordsByParagraph = useMemo(() => {
    const groups: ScriptWord[][] = paragraphs.map(() => []);
    tokenizedWords.forEach((w) => groups[w.paragraphIndex]?.push(w));
    return groups;
  }, [paragraphs, tokenizedWords]);

  // A new text size or style reflows every line. Keep the word being read on
  // the reading guide (before paint, so the text never visibly jumps), whether
  // the prompter is running or paused.
  useLayoutEffect(() => {
    const container = prompterContainerRef.current;
    const wordEl = document.getElementById(`ft-word-${currentWordIndexRef.current}`);
    if (!container || !wordEl) return;
    const guideY = readingGuideY();
    container.scrollTop += wordEl.getBoundingClientRect().top - container.getBoundingClientRect().top - guideY;
  }, [fontSize, textStyle]);

  const scrollElementToGuide = useCallback((element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    const container = prompterContainerRef.current;
    if (!container || !element) return;

    const guideViewportY = readingGuideY();
    const targetScrollTop = Math.max(0, element.offsetTop - guideViewportY);

    container.scrollTo({
      top: targetScrollTop,
      behavior,
    });
  }, []);

  const handleLineClick = (paraIdx: number) => {
    setActiveLineIndex(paraIdx);
    const firstWord = tokenizedWords.find((w) => w.paragraphIndex === paraIdx);
    if (firstWord) {
      setCurrentWordIndex(firstWord.globalIndex);
      targetWordIndexRef.current = firstWord.globalIndex;
      syncSpeechPosToWord(firstWord.globalIndex);
      paceHistoryRef.current = [{ time: performance.now(), wordIndex: firstWord.globalIndex }];
    }
    const el = document.getElementById(`prompter-para-${paraIdx}`);
    scrollElementToGuide(el, 'smooth');
    // Forget words heard before the jump so a late result can't pull the
    // script back to where the speaker was.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Stable identity so memoized paragraphs don't re-render for a new handler.
  const handleLineClickRef = useRef(handleLineClick);
  handleLineClickRef.current = handleLineClick;
  const onLineClick = useCallback((paraIdx: number) => handleLineClickRef.current(paraIdx), []);

  const handleRestartFromTop = () => {
    const container = prompterContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Start on the first word that is read aloud, not a note or a symbol.
    const firstWord = speechTokens[0]?.wordIndex ?? 0;
    setActiveLineIndex(tokenizedWords[firstWord]?.paragraphIndex ?? 0);
    setCurrentWordIndex(firstWord);
    currentWordIndexRef.current = firstWord;
    targetWordIndexRef.current = firstWord;
    speechPosRef.current = 0;
    paceHistoryRef.current = [];
    setElapsedSeconds(0);
    setLastRecognizedPhrase('');
    setSessionStarted(false);
    // The recognizer keeps everything heard in this listening session; restart
    // it so words said before "Start over" can't pull the script back down.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Pause stops at once. Start counts down 3-2-1 and begins at the first line;
  // after a Pause mid-script the same button reads "Resume" and counts down
  // back into the line where the speaker stopped.
  const canResume = sessionStarted && currentWordIndex > 0 && currentWordIndex < tokenizedWords.length - 1;
  const handleStartPause = () => {
    if (!isPaused) {
      setIsPaused(true);
      return;
    }
    const resume = canResume;
    runCountdown(() => {
      if (!resume) handleRestartFromTop();
      setSessionStarted(true);
      setIsPaused(false);
    });
  };

  // -------------------------------------------------------------
  // 3. ENHANCED SPEECH RECOGNITION (Web Speech API)
  // -------------------------------------------------------------
  useEffect(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (scrollMode !== 'voice' || isPaused) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.warn(e);
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      wordTrackingRef.current = false;
      setShowUnsupportedBanner(true);
      setScrollMode('auto');
      return;
    }

    // Chrome's recognizer ends itself after pauses, can go deaf (hearing
    // speech but returning no words and no error), and keeps one unfinished
    // result growing while the speaker talks without a break. Every listening
    // session gets a fresh recognizer, started the moment the last one ends,
    // and a watchdog replaces a recognizer that has gone deaf or run long.
    let recognition: SpeechRecognitionInstance | null = null;
    let isDisposed = false;
    let stopped = false; // microphone blocked: never restart
    let startedAt = 0;
    let quickEnds = 0;
    let speechWithoutWordsMs = 0;
    let longResultPending = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // Each result moves the reading position to the last script word heard.
    const handleResult = (event: SpeechRecognitionEvent) => {
      setIsListening(true);

      // A result that is still unfinished after this many words is replaced
      // at the speaker's next pause, and immediately at the hard limit.
      const newest = event.results[event.results.length - 1];
      if (newest && !newest.isFinal) {
        const newestWords = (newest[0]?.transcript || '').trim().split(/\s+/).filter(Boolean).length;
        if (newestWords >= LONG_RESULT_WORDS) longResultPending = true;
        if (newestWords >= MAX_RESULT_WORDS) later(() => replaceRecognizer('unfinished result too long'), 0);
      }

      // Top guess of every result, finished or not, oldest first.
      // Only the newest results matter for the next match. The list grows
      // for the whole listening session, so re-reading all of it made every
      // update slower the longer the speaker talked.
      const transcripts: string[] = [];
      let wordsCollected = 0;
      for (let i = event.results.length - 1; i >= 0 && wordsCollected < 12; i--) {
        const t = event.results[i][0]?.transcript || '';
        transcripts.unshift(t);
        wordsCollected += t.trim().split(/\s+/).filter(Boolean).length;
      }
      const heard = tailTokensFromResults(transcripts);
      if (heard.length === 0) return;
      speechWithoutWordsMs = 0;
      setLastRecognizedPhrase(heard.slice(-4).map((h) => h.norm).join(' '));

      const prevPos = speechPosRef.current;
      const nextPos = advanceSpeechPosition(speechTokens, prevPos, heard);
      if (nextPos <= prevPos) return;

      speechPosRef.current = nextPos;
      wordTrackingRef.current = true;
      const wordIdx =
        nextPos >= speechTokens.length
          ? tokenizedWords.length - 1
          : speechTokens[nextPos].wordIndex;
      targetWordIndexRef.current = wordIdx;
      setCurrentWordIndex(wordIdx);
      setActiveLineIndex(tokenizedWords[wordIdx]?.paragraphIndex ?? 0);

      // Learn the speaker's pace over the last 15s for the time-left estimate
      const now = performance.now();
      paceHistoryRef.current.push({ time: now, wordIndex: wordIdx });
      paceHistoryRef.current = paceHistoryRef.current.filter((p) => now - p.time <= 15000);
      if (paceHistoryRef.current.length >= 2) {
        const first = paceHistoryRef.current[0];
        const dtMin = (now - first.time) / 60000;
        const dw = wordIdx - first.wordIndex;
        if (dtMin >= 0.05 && dw > 0) {
          const measuredWpm = dw / dtMin;
          if (measuredWpm >= 50 && measuredWpm <= 300) {
            setDynamicWpm(Math.min(220, Math.max(80, Math.round(measuredWpm))));
          }
        }
      }
    };

    // Plain-English error reporting without breaking volume-based scrolling
    const handleError = (err: string, message?: string) => {
      console.warn('SpeechRecognition error:', err, message);

      if (err === 'no-speech' || err === 'aborted') {
        return;
      }

      if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
        // No mic means neither word matching nor volume scrolling can run; stop retrying.
        stopped = true;
        recognitionRef.current = null;
        setIsListening(false);
        setMicBlocked(true);
        setVoiceNotice(err === 'audio-capture' ? 'No microphone found. Plug one in, or switch to steady auto-scroll.' : MIC_BLOCKED_NOTICE);
      } else if (err === 'network') {
        wordTrackingRef.current = false;
        setVoiceNotice('Word tracking is offline right now, so the script follows the sound of your voice instead.');
      } else {
        wordTrackingRef.current = false;
        setVoiceNotice('Word tracking paused for a moment. The script still follows the sound of your voice.');
      }
    };

    const startRecognizer = () => {
      if (isDisposed || stopped) return;
      const r = new SpeechRec();
      r.continuous = true;
      r.interimResults = true;
      r.lang = speechLang;
      r.maxAlternatives = 1;

      // Events from a recognizer that has been replaced are ignored.
      r.onaudiostart = () => {
        if (!isDisposed && recognition === r) setIsListening(true);
      };
      r.onspeechstart = () => {
        if (!isDisposed && recognition === r) setIsListening(true);
      };
      r.onresult = (event: SpeechRecognitionEvent) => {
        if (!isDisposed && recognition === r) handleResult(event);
      };
      r.onerror = (event: any) => {
        if (!isDisposed && recognition === r) handleError(event.error, event.message);
      };
      r.onend = () => {
        if (isDisposed || recognition !== r) return;
        if (stopped) {
          setIsListening(false);
          return;
        }
        // Restart at once so the first word after a pause is heard. If it
        // keeps ending right after starting (offline, service refusing),
        // wait a second between tries instead of looping.
        quickEnds = performance.now() - startedAt < 1000 ? quickEnds + 1 : 0;
        if (quickEnds >= 3) later(startRecognizer, 1000);
        else startRecognizer();
      };

      recognition = r;
      recognitionRef.current = r;
      startedAt = performance.now();
      speechWithoutWordsMs = 0;
      longResultPending = false;
      try {
        r.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Recognition start note:', e);
        later(startRecognizer, 250);
      }
    };

    // Stop the current recognizer and start a fresh one as soon as the old
    // one has let go of the microphone (or after 250 ms at most).
    const replaceRecognizer = (reason: string) => {
      const old = recognition;
      if (!old || isDisposed || stopped) return;
      console.warn(`Restarting speech recognition: ${reason}`);
      recognition = null;
      let started = false;
      const startNew = () => {
        if (started) return;
        started = true;
        startRecognizer();
      };
      old.onresult = null;
      old.onerror = null;
      old.onend = startNew;
      try {
        old.abort();
      } catch (e) {
        console.warn(e);
      }
      later(startNew, 250);
    };

    // Watchdog. isSpeakingRef comes from the microphone loudness meter.
    const watchdog = setInterval(() => {
      if (isDisposed || stopped || !recognition) return;
      if (isSpeakingRef.current) speechWithoutWordsMs += WATCHDOG_MS;
      if (speechWithoutWordsMs >= DEAF_AFTER_MS) {
        replaceRecognizer(`no words during ${DEAF_AFTER_MS / 1000}s of speech`);
      } else if (longResultPending && !isSpeakingRef.current) {
        replaceRecognizer('long unfinished result, replaced at a pause');
      }
    }, WATCHDOG_MS);

    try {
      startRecognizer();
      // Words decide the position from the moment recognition runs. Loudness
      // scrolling is only the fallback when recognition is unavailable or
      // fails; letting it run until the first word arrives would push the
      // (forward-only) position ahead of the speaker after every Resume.
      wordTrackingRef.current = true;
    } catch (err: any) {
      console.warn('Speech recognition init error:', err);
      wordTrackingRef.current = false;
      setVoiceNotice('Word tracking couldn’t start, so the script follows the sound of your voice instead.');
    }

    return () => {
      isDisposed = true;
      clearInterval(watchdog);
      timers.forEach(clearTimeout);
      timers.clear();
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          console.warn(e);
        }
      }
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [scrollMode, isPaused, speechLang, tokenizedWords, speechTokens]);

  // -------------------------------------------------------------
  // REAL RECORDING & WEBCAM ACTIVATION
  // -------------------------------------------------------------
  const activateWebcam = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });

      webcamStreamRef.current = stream;

      if (stream.getVideoTracks().length > 0) {
        setUseLiveWebcam(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn('Video play error:', e));
        }
      } else {
        setUseLiveWebcam(false);
        setCameraError('Camera not available. You can still record audio.');
      }
    } catch (err: any) {
      console.warn('Webcam getUserMedia error:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webcamStreamRef.current = audioStream;
        setUseLiveWebcam(false);
        setCameraError('Camera not available. You can still record audio.');
      } catch (audioErr) {
        setUseLiveWebcam(false);
        setCameraError('Camera and microphone are blocked. You can still use the prompter, but you can’t record.');
      }
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setUseLiveWebcam(false);
  };

  const toggleWebcam = () => {
    if (useLiveWebcam) {
      stopWebcam();
    } else {
      activateWebcam();
    }
  };

  const getSupportedMimeType = (audioOnly: boolean): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = audioOnly
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const startRecordingStream = async () => {
    let stream = webcamStreamRef.current;

    if (!stream || stream.getTracks().every((t) => t.readyState === 'ended')) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
        webcamStreamRef.current = stream;
      } catch (e: any) {
        console.warn('Could not acquire camera for recording:', e);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream = audioStream;
          webcamStreamRef.current = audioStream;
          setUseLiveWebcam(false);
          setCameraError('Camera not available. Recording audio only.');
        } catch (audioErr) {
          setCameraError('Your microphone is blocked, so recording can’t start.');
          return;
        }
      }
    }

    // Voice follow opens the microphone on its own, so the stream may have
    // sound but no camera. Add the camera to it rather than record sound only.
    const hasLiveVideo = (s: MediaStream | null) =>
      !!s && s.getVideoTracks().some((t) => t.readyState === 'live');
    if (stream && !hasLiveVideo(stream)) {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        stream = new MediaStream([...cam.getVideoTracks(), ...stream.getAudioTracks()]);
        webcamStreamRef.current = stream;
      } catch (e) {
        console.warn('Could not add the camera for recording:', e);
      }
    }

    const audioOnly = !hasLiveVideo(stream);
    if (audioOnly) {
      setCameraError('No camera available, so this take records audio only.');
    }

    if (stream && !audioOnly) {
      setUseLiveWebcam(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    }

    if (!stream || typeof MediaRecorder === 'undefined') {
      setCameraError('This browser can’t record video, or the microphone is blocked.');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType(audioOnly);
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || (audioOnly ? 'audio/webm' : 'video/webm');
        const blob = new Blob(recordedChunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);
        takeCounterRef.current += 1;

        const newTake: PrompterTake = {
          id: `take-${Date.now()}`,
          takeNumber: takeCounterRef.current,
          durationSec: Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000)),
          blob,
          url,
          mimeType: actualMime,
          audioOnly,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDownloaded: false,
        };

        setTakes((prev) => [...prev, newTake]);
        // Go straight to the take just recorded: watch, download or retake.
        setPreviewTake(newTake);
      };

      recordStartTimeRef.current = Date.now();
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
    } catch (err: any) {
      console.warn('MediaRecorder start error:', err);
      setCameraError(`Recording failed: ${err.message || 'MediaRecorder error'}`);
    }
  };

  const stopRecordingStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(true);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  // 3-2-1 overlay, then `onDone`. Ignored while a countdown is already running.
  const runCountdown = (onDone: () => void) => {
    if (countdownIntervalRef.current) return;
    setCountdown(3);
    let remaining = 3;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdown(null);
      onDone();
    }, 1000);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecordingStream();
    } else {
      runCountdown(() => {
        // Every take starts from the first line of the script.
        handleRestartFromTop();
        setSessionStarted(true);
        startRecordingStream();
      });
    }
  };

  useEffect(() => {
    if (!isRecording || isPaused) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  // Release everything only when the studio closes. This must not depend on
  // `takes`: re-running on each new take would revoke earlier takes' videos
  // and switch the camera off between takes.
  const takesRef = useRef<PrompterTake[]>(takes);
  takesRef.current = takes;
  const cleanupWebAudioRef = useRef(cleanupWebAudio);
  cleanupWebAudioRef.current = cleanupWebAudio;
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch (e) {
          console.warn(e);
        }
      }
      takesRef.current.forEach((t) => URL.revokeObjectURL(t.url));
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      cleanupWebAudioRef.current();
    };
  }, []);

  const handleDownloadTake = (take: PrompterTake) => {
    const ext = take.mimeType.includes('mp4') ? (take.audioOnly ? 'm4a' : 'mp4') : take.audioOnly ? 'weba' : 'webm';
    const slug = (script.title || 'first-take-script')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `${slug}-take-${take.takeNumber}.${ext}`;

    const a = document.createElement('a');
    a.href = take.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTakes((prev) =>
      prev.map((t) => (t.id === take.id ? { ...t, isDownloaded: true } : t))
    );
  };

  const handleDeleteTake = (takeId: string) => {
    const target = takes.find((t) => t.id === takeId);
    if (target) {
      URL.revokeObjectURL(target.url);
    }
    setTakes((prev) => prev.filter((t) => t.id !== takeId));
    if (previewTake && previewTake.id === takeId) {
      setPreviewTake(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      // While a take, the takes list or help is open, keys belong to that
      // window (Space pauses the video); only Escape (close) passes through.
      if ((previewTake || showTakesModal || showHelpModal) && e.code !== 'Escape') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleStartPause();
      } else if (e.code === 'Home' && !isRecording) {
        e.preventDefault();
        handleRestartFromTop();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setTextStyle((s) => nextTextStyle(s));
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMirrored((prev) => !prev);
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        if (SPEECH_RECOGNITION_SUPPORTED) setScrollMode((prev) => (prev === 'voice' ? 'auto' : 'voice'));
      } else if (e.code === 'ArrowUp' && scrollModeRef.current === 'auto') {
        e.preventDefault();
        setBaseWpm((prev) => Math.min(220, prev + 5));
      } else if (e.code === 'ArrowDown' && scrollModeRef.current === 'auto') {
        e.preventDefault();
        setBaseWpm((prev) => Math.max(80, prev - 5));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setFontSize((prev) => clampFontSize(prev + FONT_STEP));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setFontSize((prev) => clampFontSize(prev - FONT_STEP));
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        // Close an open panel first; only leave the studio when nothing is open.
        if (previewTake) setPreviewTake(null);
        else if (showHelpModal) setShowHelpModal(false);
        else if (showTakesModal) setShowTakesModal(false);
        else if (countdown !== null) cancelCountdown();
        else handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isPaused, takes, handleToggleRecord, previewTake, showHelpModal, showTakesModal, countdown]);

  const handleExit = () => {
    const hasUnsavedTakes = takes.some((t) => !t.isDownloaded);

    if (hasUnsavedTakes) {
      if (!confirm('Some takes aren’t downloaded yet and will be lost. Leave anyway?')) {
        return;
      }
    } else {
      if (!confirm('Leave the prompter?')) {
        return;
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn(e);
      }
    }
    stopWebcam();
    cleanupWebAudio();
    onExit();
  };

  // Status strip under the line being read (only the active paragraph shows it).
  const activeFooter = (
          <div className="mt-2 flex items-center justify-between text-xs font-label-meta text-forest pt-1 border-t border-forest/15">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                {scrollMode === 'voice' ? 'hearing' : 'speed'}
              </span>
              <span>
                {scrollMode === 'voice'
                  ? isSpeaking
                    ? 'Speaking'
                    : micBlocked
                    ? 'Mic blocked'
                    : isPaused
                    ? 'Voice paused'
                    : 'Listening for speech'
                  : `${effectiveWpm} WPM Pace`}
              </span>
              {isSpeaking && scrollMode === 'voice' && (
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping"></span>
              )}
            </div>
            {lastRecognizedPhrase && scrollMode === 'voice' ? (
              <span className="text-[11px] text-ink-soft italic truncate max-w-[180px]">
                Hearing: &ldquo;{lastRecognizedPhrase}&rdquo;
              </span>
            ) : (
              <span className="text-[10px] text-ink-faint uppercase">Click to re-anchor</span>
            )}
          </div>
  );

  return (
    <div
      className={`min-h-screen w-full relative select-none transition-colors duration-300 font-body-sm ${
        isNightMode ? 'bg-[#1F1D1A] text-[#FAF7F0]' : 'bg-[#FAF7F0] text-[#1F1D1A]'
      }`}
    >
      {/* 3-2-1 COUNTDOWN OVERLAY */}
      {countdown !== null && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn text-center">
          <span className="font-label-eyebrow text-sm uppercase tracking-widest text-primary-fixed mb-4 font-bold">
            GET READY
          </span>
          <div className="font-headline-lg font-display text-8xl sm:text-9xl text-white font-bold animate-pulse">
            {countdown}
          </div>
          <p className="mt-6 text-sm text-white/70 font-body-sm">
            Look at the lens. The script starts after the countdown.
          </p>
          <button
            onClick={cancelCountdown}
            className="mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* NO SPEECH RECOGNITION IN THIS BROWSER */}
      {showUnsupportedBanner && !cameraError && !voiceNotice && (
        <div role="status" className="fixed top-18 left-1/2 -translate-x-1/2 z-45 max-w-xl w-full px-4">
          <div className="p-3.5 rounded-xl bg-marker/95 text-ink border border-marker-border shadow-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-tertiary">info</span>
              <span>
                This browser can’t follow your voice, so the script scrolls at a fixed speed (↑/↓ to adjust).
                For voice follow, open First Take in Google Chrome or Microsoft Edge.
              </span>
            </div>
            <button aria-label="Dismiss"
              onClick={() => setShowUnsupportedBanner(false)}
              className="text-ink/60 hover:text-ink cursor-pointer p-1 shrink-0"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP NOTICES */}
      {(cameraError || voiceNotice) && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-45 max-w-xl w-full px-4">
          <div className="p-3.5 rounded-xl bg-marker/95 text-ink border border-marker-border shadow-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-tertiary">info</span>
              <span>{cameraError || voiceNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {micBlocked && scrollMode === 'voice' && (
                <button
                  onClick={() => {
                    setScrollMode('auto');
                    setVoiceNotice(null);
                  }}
                  className="px-2.5 py-1 rounded bg-forest hover:bg-forest-dark text-on-forest font-semibold font-body-sm text-[11px] shadow-2xs cursor-pointer"
                >
                  Use auto-scroll
                </button>
              )}
              {voiceNotice && (
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-2.5 py-1 rounded bg-paper-raised hover:bg-white text-ink font-semibold font-body-sm text-[11px] border border-paper-line shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Open the prompter in a new tab, where the browser can ask for the microphone"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">open_in_new</span>
                  <span>Open in new tab</span>
                </button>
              )}
              <button aria-label="Dismiss"
                onClick={() => {
                  setCameraError(null);
                  setVoiceNotice(null);
                }}
                className="text-ink/60 hover:text-ink cursor-pointer p-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-48 bg-gradient-to-b from-forest-tint/30 via-forest-tint/10 to-transparent pointer-events-none rounded-full blur-3xl"></div>

      {/* ============================================================== */}
      {/* PROMPTER HUD / CONTROL HEADER                                  */}
      {/* ============================================================== */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between py-3 px-6 md:px-12 backdrop-blur-md border-b transition-colors duration-300 ${
          isNightMode
            ? 'bg-[#1F1D1A]/90 border-[#3A3631]'
            : 'bg-[#FAF7F0]/90 border-paper-line'
        }`}
      >
        {/* Left: Recording, Mode Toggle, Language Selector & Status Chip */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Record button indicator */}
          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
              isRecording
                ? 'bg-rec-tint text-rec border border-rec/30'
                : isNightMode
                ? 'bg-[#2A2724] text-[#A39E92] hover:text-[#FAF7F0] border border-[#3A3631]'
                : 'bg-paper-raised text-ink-soft hover:text-ink border border-paper-line'
            }`}
            title={isRecording ? 'Stop take (R)' : 'Start recording (R)'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording && !isPaused ? 'bg-rec animate-pulse' : 'bg-rec'
              }`}
            ></span>
            <span className="font-label-meta text-xs tracking-wider font-bold">
              {isRecording ? `REC ${formatTime(elapsedSeconds)}` : 'READY'}
            </span>
          </button>

          {/* Auto-scroll is a fallback only; offer the way back to voice follow */}
          {scrollMode === 'auto' && SPEECH_RECOGNITION_SUPPORTED && (
            <button
              onClick={() => {
                setMicBlocked(false);
                setScrollMode('voice');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-label-meta cursor-pointer transition-colors ${
                isNightMode
                  ? 'bg-[#2A2724] border-[#3A3631] text-[#FAF7F0] hover:text-primary-fixed'
                  : 'bg-paper-raised border-paper-line text-ink hover:text-forest'
              }`}
              title="Switch back to voice follow"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">speed</span>
              <span>Auto-scroll on · Back to voice follow</span>
            </button>
          )}

          {/* 3. Language / Accent Selector with en-IN as DEFAULT */}
          {scrollMode === 'voice' && (
            <select
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-label-meta border cursor-pointer outline-none transition-colors shadow-2xs ${
                isNightMode
                  ? 'bg-[#2A2724] border-[#3A3631] text-[#FAF7F0]'
                  : 'bg-paper-raised border-paper-line text-ink'
              }`}
              title="The language you'll speak"
            >
              <option value="en-IN">English (India) · en-IN</option>
              <option value="en-US">English (US) · en-US</option>
              <option value="en-GB">English (UK) · en-GB</option>
              <option value="hi-IN">Hindi · hi-IN</option>
            </select>
          )}

          {/* 4. Live Voice Status Chip: Listening / Speaking / Paused (silence) */}
          {scrollMode === 'voice' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-label-meta font-bold uppercase tracking-wider border transition-colors ${
                isSpeaking
                  ? 'bg-forest-tint text-forest border-forest/30'
                  : !isPaused
                  ? isNightMode
                    ? 'bg-[#2A2724] text-primary-fixed border-[#3A3631]'
                    : 'bg-paper-raised text-forest border-paper-line'
                  : isNightMode
                  ? 'bg-[#2A2724] text-[#A39E92] border-[#3A3631]'
                  : 'bg-paper-sunk text-ink-faint border-paper-line'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpeaking
                    ? 'bg-forest animate-ping'
                    : !isPaused
                    ? 'bg-primary-fixed'
                    : 'bg-ink-faint'
                }`}
              ></span>
              <span>
                {micBlocked
                  ? 'Mic blocked'
                  : isPaused
                  ? 'Paused'
                  : isSpeaking
                  ? 'Speaking'
                  : 'Listening'}
              </span>
            </div>
          )}

          {/* Recorded Takes Chip (only once there is something to see) */}
          {takes.length > 0 && (
          <button
            onClick={() => setShowTakesModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-label-meta cursor-pointer transition-colors ${
              takes.length > 0
                ? 'bg-marker text-ink border-marker-border font-bold'
                : isNightMode
                ? 'bg-[#2A2724] border-[#3A3631] text-[#A39E92]'
                : 'bg-paper-raised border-paper-line text-ink-soft'
            }`}
            title="View recorded takes"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">video_library</span>
            <span>Takes: {takes.length}</span>
            {takes.some((t) => !t.isDownloaded) && (
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
            )}
          </button>
          )}
        </div>

        {/* Center: progress */}
        <div className="hidden xl:flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-label-meta ${
              isNightMode ? 'bg-[#2A2724] border-[#3A3631] text-[#FAF7F0]' : 'bg-paper-raised border-paper-line text-ink'
            }`}
          >
            <span>{remainingSeconds > 0 ? `${formatTime(remainingSeconds)} left` : 'Finished'}</span>
            <span className="text-ink-faint">•</span>
            <span className="text-ink-soft">{progressPercent}%</span>
          </div>
        </div>

        {/* Right: Help, Script Title & Safe Exit */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-label-eyebrow text-[10px] uppercase text-ink-faint tracking-wider">Active Script</p>
            <p className="font-title-md text-xs font-medium max-w-[170px] truncate">{script.title}</p>
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border font-label-meta text-xs transition-colors cursor-pointer ${
              isNightMode
                ? 'border-[#3A3631] text-[#A39E92] hover:text-[#FAF7F0]'
                : 'border-paper-line text-ink-soft hover:text-ink'
            }`}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>

          <button
            onClick={handleExit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-body-sm text-xs cursor-pointer ${
              isNightMode
                ? 'border-[#3A3631] text-[#A39E92] hover:text-[#FAF7F0] hover:bg-[#2A2724]'
                : 'border-paper-line text-ink-soft hover:text-ink hover:bg-paper-sunk'
            }`}
            title="Leave the prompter (Esc)"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">close</span>
            <span className="hidden sm:inline">Exit</span>
            <kbd className="px-1.5 py-0.5 rounded bg-paper-sunk/80 font-label-meta text-[10px] text-ink-faint border border-paper-line/50">
              Esc
            </kbd>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* LIVE CAMERA HUD PiP (Floating Top-Right)                      */}
      {/* ============================================================== */}
      {!showCameraPreview && (
        <button
          onClick={() => setShowCameraPreview(true)}
          className="fixed top-20 right-6 sm:right-12 z-40 px-3 py-1.5 rounded-full bg-night-paper text-white font-label-meta text-[11px] flex items-center gap-1.5 shadow-lg border border-forest cursor-pointer"
          title="Show the camera preview"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rec animate-ping' : 'bg-forest'}`}></span>
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">videocam</span>
          <span>Show camera</span>
        </button>
      )}
      <div
        className={`fixed top-20 right-6 sm:right-12 z-40 w-[160px] sm:w-[200px] lg:w-[240px] aspect-video rounded-xl overflow-hidden bg-night-paper shadow-2xl border-2 border-forest group transition-all duration-200 ${
          showCameraPreview ? '' : 'hidden'
        }`}
      >
        <div className="relative w-full h-full">
          <button
            onClick={() => setShowCameraPreview(false)}
            className="absolute top-8 right-2 w-6 h-6 rounded bg-night-paper/80 text-white hover:bg-night-paper flex items-center justify-center cursor-pointer border border-white/20 z-20"
            title="Hide the camera preview (recording carries on)"
            aria-label="Hide the camera preview"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">close_fullscreen</span>
          </button>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-200 ${
              useLiveWebcam ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          />

          {!useLiveWebcam && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-white/60">
              <span aria-hidden="true" className="material-symbols-outlined text-[28px]">videocam_off</span>
              <span className="font-label-meta text-[10px] uppercase tracking-wider">Camera off</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-night-paper/85 via-transparent to-night-paper/40 pointer-events-none z-15"></div>

          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white z-20">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rec animate-ping' : 'bg-forest'}`}></span>
            <span className="font-label-meta text-[9px] tracking-wider uppercase font-bold">
              {useLiveWebcam ? 'WEBCAM' : 'PREVIEW'}
            </span>
          </div>

          <button
            onClick={toggleWebcam}
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-night-paper/80 text-white font-label-meta text-[10px] hover:bg-night-paper transition-colors flex items-center gap-1 cursor-pointer border border-white/20 z-20"
            title={useLiveWebcam ? 'Turn off camera' : 'Turn on camera'}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[13px]">
              {useLiveWebcam ? 'videocam_off' : 'videocam'}
            </span>
            <span>{useLiveWebcam ? 'Off' : 'Webcam'}</span>
          </button>

          {/* 1. Real Audio Waveform Visualizer driven by live RMS volume */}
          <div className="absolute bottom-1.5 left-2 right-2 flex flex-col gap-0.5 px-1.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg border border-white/10 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-end gap-1 h-3">
                <div
                  style={{ height: `${Math.max(3, micVisualLevels[0] * 12)}px` }}
                  className={`w-1 bg-forest rounded-full transition-all duration-75 ${
                    micVisualLevels[0] > 0.1 ? 'opacity-100' : 'opacity-30'
                  }`}
                ></div>
                <div
                  style={{ height: `${Math.max(3, micVisualLevels[1] * 12)}px` }}
                  className={`w-1 bg-forest rounded-full transition-all duration-75 ${
                    micVisualLevels[1] > 0.15 ? 'opacity-100' : 'opacity-30'
                  }`}
                ></div>
                <div
                  style={{ height: `${Math.max(3, micVisualLevels[2] * 12)}px` }}
                  className={`w-1 bg-forest rounded-full transition-all duration-75 ${
                    micVisualLevels[2] > 0.2 ? 'opacity-100' : 'opacity-30'
                  }`}
                ></div>
                <div
                  style={{ height: `${Math.max(3, micVisualLevels[3] * 12)}px` }}
                  className={`w-1 bg-forest rounded-full transition-all duration-75 ${
                    micVisualLevels[3] > 0.25 ? 'opacity-100' : 'opacity-30'
                  }`}
                ></div>
                <div
                  style={{ height: `${Math.max(3, micVisualLevels[4] * 12)}px` }}
                  className={`w-1 bg-forest rounded-full transition-all duration-75 ${
                    micVisualLevels[4] > 0.3 ? 'opacity-100' : 'opacity-30'
                  }`}
                ></div>
              </div>
              <div className="flex items-center gap-1.5">
                {isSpeaking && (
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping"></span>
                )}
                <span className="font-label-meta text-[9px] text-white/80 uppercase font-semibold">
                  {micBlocked ? 'MIC BLOCKED' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : 'MIC STANDBY'}
                </span>
              </div>
            </div>

            {/* 4. Live recognized words transcript ("Hearing: ...") */}
            {lastRecognizedPhrase && (
              <div className="flex items-center gap-1 overflow-hidden pt-0.5 border-t border-white/10">
                <span className="font-label-meta text-[8px] text-white/50 uppercase">HEARING:</span>
                <p
                  className="font-label-meta text-[9px] text-marker font-semibold truncate max-w-[170px]"
                  title={lastRecognizedPhrase}
                >
                  &ldquo;{lastRecognizedPhrase}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* READING GUIDE LINE (FIXED AT 33% FROM TOP)                     */}
      {/* ============================================================== */}
      <div
        ref={guideRef}
        style={{ top: '33vh' }}
        className="fixed left-0 right-0 z-20 pointer-events-none flex items-center justify-between px-4 sm:px-12"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-forest opacity-70">arrow_right</span>
        <div className="flex-1 mx-2 h-[1px] bg-gradient-to-r from-forest/50 via-forest/20 to-transparent"></div>
      </div>

      {/* ============================================================== */}
      {/* PRIMARY PROMPTER SCROLL CONTAINER                             */}
      {/* ============================================================== */}
      <div
        ref={prompterContainerRef}
        onScroll={updateActiveLineFromScroll}
        style={{ height: scrollAreaHeight ? `${scrollAreaHeight}px` : '100vh' }}
        className={`overflow-y-auto overflow-x-hidden w-full relative px-6 flex justify-center focus:outline-none ${
          showCameraPreview ? 'sm:pr-[248px] lg:pr-[312px]' : ''
        }`}
      >
        <div
          ref={scriptContentRef}
          style={{
            fontSize: `${fontSize}px`,
            transform: isMirrored ? 'scaleX(-1)' : 'none',
          }}
          className={`w-full min-w-0 max-w-[28ch] h-max pt-[33vh] pb-[60vh] flex flex-col gap-10 text-left tracking-tight leading-[1.45] [overflow-wrap:anywhere] hyphens-auto transition-transform duration-200 ${
            textStyle === 'serif' ? 'font-prompter-reading' : 'font-body-md'
          } ${textStyle === 'bold' ? '[&_*]:font-bold!' : ''}`}
        >
          {paragraphs.map((_para, paraIdx) => {
            const status: ParagraphStatus =
              paraIdx === activeLineIndex
                ? 'active'
                : paraIdx < activeLineIndex
                ? 'past'
                : paraIdx === activeLineIndex + 1
                ? 'next'
                : 'upcoming';
            return (
              <ScriptParagraph
                key={paraIdx}
                words={wordsByParagraph[paraIdx]}
                paraIdx={paraIdx}
                status={status}
                currentWordIndex={
                  status === 'active' ? currentWordIndex : status === 'past' ? Number.MAX_SAFE_INTEGER : -1
                }
                isNightMode={isNightMode}
                dimSpoken={scrollMode === 'voice'}
                onLineClick={onLineClick}
                footer={status === 'active' ? activeFooter : null}
              />
            );
          })}

          <div className="pt-16 pb-32 text-center">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-meta text-xs uppercase tracking-widest border ${
                isNightMode
                  ? 'bg-[#2A2724] border-[#3A3631] text-[#6B665C]'
                  : 'bg-paper-sunk border-paper-line text-ink-faint'
              }`}
            >
              • End of Script •
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING HUD CONTROL DOCK (BOTTOM CENTER)                      */}
      {/* ============================================================== */}
      <div ref={dockRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 w-full max-w-3xl px-4">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 w-full px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(31,29,26,0.18)] border transition-colors ${
            isNightMode
              ? 'bg-[#2A2724]/95 border-[#3A3631] text-[#FAF7F0]'
              : 'bg-paper-raised/95 border-paper-line text-ink'
          }`}
        >
          {/* 1. Record & Play/Pause Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleRecord}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer ${
                isRecording
                  ? 'bg-rec hover:bg-rec/90 text-white animate-pulse'
                  : 'bg-rec hover:bg-rec/90 text-white'
              }`}
              title={isRecording ? 'Stop recording (R)' : 'Start countdown & record (R)'}
              aria-label={isRecording ? 'Stop recording (R)' : 'Start countdown & record (R)'}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
                {isRecording ? 'stop' : 'radio_button_checked'}
              </span>
            </button>

            <button
              onClick={handleStartPause}
              className={`flex items-center gap-1.5 px-4 h-11 rounded-xl transition-colors font-body-sm text-sm cursor-pointer border ${
                isPaused
                  ? 'bg-forest text-on-forest border-forest font-semibold shadow-xs'
                  : isNightMode
                  ? 'bg-[#3A3631] hover:bg-[#4A453F] text-[#FAF7F0] border-transparent'
                  : 'bg-paper-sunk hover:bg-paper-line text-ink border-paper-line/50'
              }`}
              title="Start or pause (Space)"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? (canResume ? 'Resume' : 'Start') : 'Pause'}</span>
            </button>

            <button
              onClick={handleRestartFromTop}
              disabled={isRecording}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isNightMode ? 'hover:bg-[#3A3631] text-[#A39E92] hover:text-[#FAF7F0]' : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Start over from the first line (Home)"
              aria-label="Start over from the first line"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">restart_alt</span>
            </button>
          </div>

          {/* 2. Speed controls exist only for the auto-scroll fallback */}
          {scrollMode === 'auto' && (
          <>
          <div className={`hidden sm:block w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}></div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-[240px]">
            <div className="flex justify-between items-center font-label-meta text-[11px]">
              <div className="flex items-center gap-1">
                {(['1', '2', '3'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSpeedLevel(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      speedLevel === lvl
                        ? 'bg-forest text-on-forest'
                        : isNightMode
                        ? 'bg-[#3A3631] text-[#A39E92]'
                        : 'bg-paper-sunk text-ink-soft'
                    }`}
                    title={`${lvl === '1' ? '0.75x' : lvl === '2' ? '1.0x' : '1.35x'} speed`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <span className="text-forest font-bold">{effectiveWpm} WPM</span>

              <span className="text-[10px] text-ink-faint">
                {speedLevel === '1' ? '0.75x' : speedLevel === '2' ? '1x' : '1.35x'}
              </span>
            </div>

            <input
              type="range"
              min="80"
              max="220"
              step="5"
              value={baseWpm}
              onChange={(e) => setBaseWpm(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-paper-sunk rounded-lg appearance-none cursor-pointer accent-forest"
              title="Scroll speed (↑ / ↓)"
            />
          </div>
          </>
          )}

          <div className={`hidden sm:block w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}></div>

          {/* 3. Display Adjustments: Font Sizing, Night Mode, Mirroring */}
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center rounded-xl p-0.5 border ${
                isNightMode ? 'bg-[#3A3631] border-transparent' : 'bg-paper-sunk border-paper-line/60'
              }`}
            >
              <button
                onClick={() => setFontSize((prev) => clampFontSize(prev - FONT_STEP))}
                disabled={fontSize <= FONT_MIN}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isNightMode ? 'text-[#FAF7F0] hover:bg-[#4A453F]' : 'text-ink hover:bg-paper-raised'
                }`}
                title="Smaller text (-)"
                aria-label="Smaller text"
              >
                <span className="text-[12px]">A</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">remove</span>
              </button>
              <span
                className={`min-w-[2.5rem] text-center font-label-meta text-xs font-bold select-none ${
                  isNightMode ? 'text-[#FAF7F0]' : 'text-ink'
                }`}
                title="Text size in pixels"
              >
                {fontSize}
              </span>
              <button
                onClick={() => setFontSize((prev) => clampFontSize(prev + FONT_STEP))}
                disabled={fontSize >= FONT_MAX}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isNightMode ? 'text-[#FAF7F0] hover:bg-[#4A453F]' : 'text-ink hover:bg-paper-raised'
                }`}
                title="Bigger text (+)"
                aria-label="Bigger text"
              >
                <span className="text-[16px]">A</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">add</span>
              </button>
            </div>

            <label className="relative flex items-center" title="Text style (T to switch)">
              <span className="sr-only">Text style</span>
              <select
                value={textStyle}
                onChange={(e) => {
                  setTextStyle(e.target.value as 'serif' | 'sans' | 'bold');
                  // Hand keyboard focus back so Space / R keep working.
                  e.currentTarget.blur();
                }}
                className={`h-9 pl-3 pr-8 rounded-xl border text-sm font-semibold appearance-none cursor-pointer outline-none transition-colors ${
                  isNightMode
                    ? 'bg-[#3A3631] border-transparent text-[#FAF7F0]'
                    : 'bg-paper-sunk border-paper-line/60 text-ink hover:bg-paper-raised'
                } ${textStyle === 'serif' ? 'font-prompter-reading' : textStyle === 'bold' ? 'font-body-md font-bold' : 'font-body-md'}`}
              >
                {TEXT_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span
                className={`material-symbols-outlined text-[18px] absolute right-2 pointer-events-none ${
                  isNightMode ? 'text-[#A39E92]' : 'text-ink-soft'
                }`}
              >
                expand_more
              </span>
            </label>

            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isNightMode
                  ? 'bg-marker text-ink'
                  : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Dark background"
              aria-label="Dark background"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                {isNightMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isMirrored
                  ? 'bg-forest text-on-forest'
                  : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Mirror text for teleprompter glass (M)"
              aria-label="Mirror text for teleprompter glass (M)"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">flip</span>
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* TAKES DRAWER / MODAL                                           */}
      {/* ============================================================== */}
      {showTakesModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised rounded-2xl max-w-lg w-full p-6 sm:p-8 border border-paper-line shadow-2xl text-ink space-y-6 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-paper-line">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[22px]">video_library</span>
                <h3 className="font-headline-sm text-lg font-semibold text-ink">
                  Recorded takes ({takes.length})
                </h3>
              </div>
              <button aria-label="Close"
                onClick={() => setShowTakesModal(false)}
                className="text-ink-soft hover:text-ink p-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {takes.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <span aria-hidden="true" className="material-symbols-outlined text-ink-faint text-4xl">videocam_off</span>
                <p className="font-body-sm text-sm text-ink-soft">
                  No takes recorded yet. Click the red Record button (or press <strong>R</strong>) to roll a take.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {takes.map((take) => (
                  <div
                    key={take.id}
                    className="p-3.5 rounded-xl bg-paper-sunk border border-paper-line flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">Take {take.takeNumber}</span>
                        {take.audioOnly && (
                          <span className="px-2 py-0.5 rounded bg-paper-raised border border-paper-line text-ink-soft font-label-meta text-[10px] font-bold">
                            Audio only
                          </span>
                        )}
                        {take.isDownloaded ? (
                          <span className="px-2 py-0.5 rounded bg-forest-tint text-forest font-label-meta text-[10px] font-bold">
                            Saved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-marker text-ink font-label-meta text-[10px] font-bold">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <p className="font-label-meta text-xs text-ink-soft mt-0.5">
                        Duration: {formatTime(take.durationSec)} • {take.createdAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewTake(take)}
                        className="p-2 rounded-lg bg-paper-raised hover:bg-white text-ink font-body-sm text-xs border border-paper-line cursor-pointer flex items-center gap-1 shadow-2xs"
                        title={take.audioOnly ? 'Play this take (audio only)' : 'Play this take'}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">play_arrow</span>
                        <span>Play</span>
                      </button>

                      <button
                        onClick={() => handleDownloadTake(take)}
                        className="p-2 rounded-lg bg-forest text-on-forest hover:bg-forest-dark font-body-sm text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                        title={take.audioOnly ? 'Download the audio' : 'Download the video'}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
                        <span>Save</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTake(take.id)}
                        className="p-2 rounded-lg text-ink-faint hover:text-rec cursor-pointer transition-colors"
                        title="Delete take"
                        aria-label="Delete take"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-paper-line flex items-center justify-between">
              <span className="font-label-meta text-[11px] text-ink-faint">
                Takes stay in this browser until you download them, and are lost when you leave the prompter.
              </span>
              <button
                onClick={() => setShowTakesModal(false)}
                className="px-4 py-2 bg-paper-sunk hover:bg-paper-line/50 text-ink rounded-lg font-body-sm text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIDEO PLAYBACK PREVIEW MODAL                                   */}
      {/* ============================================================== */}
      {previewTake && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-paper-raised rounded-2xl max-w-2xl w-full p-6 border border-paper-line shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">Take {previewTake.takeNumber}</span>
                <span className="font-label-meta text-xs text-ink-soft">
                  ({formatTime(previewTake.durationSec)}{previewTake.audioOnly ? ', audio only' : ''})
                </span>
              </div>
              <button aria-label="Close"
                onClick={() => setPreviewTake(null)}
                className="text-ink-soft hover:text-ink cursor-pointer p-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {previewTake.audioOnly ? (
              <div className="w-full rounded-xl bg-paper-sunk border border-paper-line p-6 flex flex-col items-center gap-3">
                <p className="font-body-sm text-sm text-ink-soft">No camera was available, so this take is audio only.</p>
                <audio src={previewTake.url} controls autoPlay className="w-full" />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video
                  src={previewTake.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleDeleteTake(previewTake.id)}
                className="text-rec text-xs font-medium hover:underline cursor-pointer flex items-center gap-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete take</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadTake(previewTake)}
                  className="px-4 py-2 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
                  <span>Download take</span>
                </button>
                <button
                  onClick={() => {
                    setPreviewTake(null);
                    handleToggleRecord();
                  }}
                  className="px-4 py-2 rounded-lg border border-paper-line hover:bg-paper-sunk text-ink font-body-sm text-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">replay</span>
                  <span>Retake</span>
                </button>
                <button
                  onClick={() => setPreviewTake(null)}
                  className="px-4 py-2 rounded-lg bg-paper-sunk hover:bg-paper-line/50 text-ink font-body-sm text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* KEYBOARD SHORTCUTS HELP MODAL                                  */}
      {/* ============================================================== */}
      {showHelpModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised rounded-2xl max-w-md w-full p-6 sm:p-8 border border-paper-line shadow-2xl text-ink space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-paper-line">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[22px]">keyboard</span>
                <h3 className="font-headline-sm text-lg font-semibold text-ink">Keyboard Shortcuts</h3>
              </div>
              <button aria-label="Close"
                onClick={() => setShowHelpModal(false)}
                className="text-ink-soft hover:text-ink cursor-pointer p-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 font-body-sm text-sm">
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Start / Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">Space</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Start over from the first line</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">Home</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Start 3-2-1 / Stop Take</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">R</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Switch voice follow / steady auto-scroll</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">V</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Mirror text for teleprompter glass</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Adjust speed (auto-scroll only)</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Font size larger / smaller</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">+ / -</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Text style: serif, sans, bold</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">T</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-ink-soft">Leave the prompter</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">Esc</kbd>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 rounded-lg bg-forest text-on-forest font-title-md text-sm font-medium hover:bg-forest-dark transition-all cursor-pointer shadow-xs"
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
