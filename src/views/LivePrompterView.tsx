/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Script } from '../types';
import { ASSETS } from '../data/defaultScripts';

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
  createdAt: string;
  isDownloaded: boolean;
}

interface ScriptWord {
  globalIndex: number;
  paragraphIndex: number;
  wordInPara: number;
  original: string;
  normalized: string;
}

interface LivePrompterViewProps {
  script: Script;
  onExit: () => void;
  isPro?: boolean;
}

// Contractions, numbers, and filler dictionaries for robust normalization
const CONTRACTIONS: Record<string, string> = {
  "don't": "do not", "dont": "do not",
  "doesn't": "does not", "doesnt": "does not",
  "didn't": "did not", "didnt": "did not",
  "it's": "it is", "its": "it is",
  "that's": "that is", "thats": "that is",
  "what's": "what is", "whats": "what is",
  "there's": "there is", "theres": "there is",
  "we're": "we are", "were": "we are",
  "they're": "they are", "theyre": "they are",
  "you're": "you are", "youre": "you are",
  "i'm": "i am", "im": "i am",
  "can't": "cannot", "cant": "cannot",
  "won't": "will not", "wont": "will not",
  "i've": "i have", "ive": "i have",
  "we've": "we have", "weve": "we have",
  "you've": "you have", "youve": "you have",
  "isn't": "is not", "isnt": "is not",
  "aren't": "are not", "arent": "are not",
  "wasn't": "was not", "wasnt": "was not",
  "weren't": "were not", "werent": "were not",
  "i'll": "i will", "ill": "i will",
  "you'll": "you will", "youll": "you will",
  "we'll": "we will", "well": "we will",
  "they'll": "they will", "theyll": "they will",
};

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
  "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
  "10": "ten", "11": "eleven", "12": "twelve", "13": "thirteen",
  "14": "fourteen", "15": "fifteen", "16": "sixteen", "17": "seventeen",
  "18": "eighteen", "19": "nineteen", "20": "twenty", "30": "thirty",
  "40": "forty", "50": "fifty", "60": "sixty", "70": "seventy",
  "80": "eighty", "90": "ninety", "100": "hundred", "1000": "thousand",
};

const FILLER_WORDS = new Set(["um", "uh", "like", "so", "you know", "ah", "er"]);

function normalizeText(text: string): string[] {
  let lower = text.toLowerCase();

  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    const reg = new RegExp(`\\b${contraction}\\b`, 'gi');
    lower = lower.replace(reg, expansion);
  }

  lower = lower.replace(/\b\d+\b/g, (match) => NUMBER_WORDS[match] || match);
  const clean = lower.replace(/[^a-z0-9\s]/g, ' ');
  return clean.split(/\s+/).filter((t) => t && !FILLER_WORDS.has(t));
}

function phoneticKey(word: string): string {
  if (!word) return '';
  const first = word[0];
  const rest = word.slice(1).replace(/[aeiouy]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  if (Math.abs(an - bn) > 2) return Math.abs(an - bn);
  const matrix: number[][] = [];
  for (let i = 0; i <= an; i++) matrix[i] = [i];
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

function fuzzyWordMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) {
    return true;
  }
  if (a.length >= 3 && b.length >= 3 && phoneticKey(a) === phoneticKey(b)) {
    return true;
  }
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4 && minLen <= 6) {
    return levenshtein(a, b) <= 1;
  }
  if (minLen >= 7) {
    return levenshtein(a, b) <= 2;
  }
  return false;
}

export const LivePrompterView: React.FC<LivePrompterViewProps> = ({
  script,
  onExit,
}) => {
  // 1. Settings state (persisted to localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ft_prompter_fontsize');
      if (saved) return Math.min(80, Math.max(24, parseInt(saved, 10)));
    } catch (e) {
      console.warn(e);
    }
    return 44;
  });

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastRafTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Web Audio API refs for hybrid volume-based scrolling
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);

  // Audio calibration & envelope state refs
  const noiseFloorRef = useRef<number>(0.008);
  const calibrationStartTimeRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const lastAboveThresholdTimeRef = useRef<number>(0);
  const firstAboveThresholdTimeRef = useRef<number | null>(null);
  const scrollVelocityMultiplierRef = useRef<number>(0); // 0 (silent) to 1 (full speed)
  const driftCorrectionFactorRef = useRef<number>(1.0); // 0.5 to 1.6
  const targetWordIndexRef = useRef<number>(0);

  // Pacing history for learning words per minute over the last 15 seconds
  const paceHistoryRef = useRef<{ time: number; wordIndex: number }[]>([]);

  // Two-pass interim confirmation ref
  const pendingMatchRef = useRef<{ candidateIdx: number; count: number }>({
    candidateIdx: -1,
    count: 0,
  });

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
      wordsInPara.forEach((word, wordIdx) => {
        const normArray = normalizeText(word);
        list.push({
          globalIndex: globalIdx++,
          paragraphIndex: paraIdx,
          wordInPara: wordIdx,
          original: word,
          normalized: normArray[0] || word.toLowerCase().replace(/[^a-z0-9]/g, ''),
        });
      });
    });

    return list;
  }, [paragraphs]);

  const totalWords = tokenizedWords.length || 1;

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

    const guideViewportY = container.clientHeight * 0.33;
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

    let stream = webcamStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0 || stream.getAudioTracks().every(t => t.readyState === 'ended')) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webcamStreamRef.current = stream;
      } catch (err) {
        console.warn('Microphone stream error for Web Audio:', err);
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

      // Start calibration for first 1000ms
      calibrationStartTimeRef.current = performance.now();
      calibrationSamplesRef.current = [];
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

          // Calibrate noise floor for the first 1000 ms
          if (calibrationStartTimeRef.current !== null) {
            const calElapsed = time - calibrationStartTimeRef.current;
            calibrationSamplesRef.current.push(rawRms);
            if (calElapsed >= 1000) {
              const sum = calibrationSamplesRef.current.reduce((a, b) => a + b, 0);
              const avg = sum / calibrationSamplesRef.current.length;
              noiseFloorRef.current = Math.max(0.003, avg);
              calibrationStartTimeRef.current = null;
            }
          }
        }

        // Voice activity detection with 150ms attack and 600ms release
        const speakingThreshold = noiseFloorRef.current * 2.5;
        let isNowSpeaking = false;

        if (rawRms > speakingThreshold) {
          if (firstAboveThresholdTimeRef.current === null) {
            firstAboveThresholdTimeRef.current = time;
          }
          if (time - firstAboveThresholdTimeRef.current >= 150) {
            isNowSpeaking = true;
          }
          lastAboveThresholdTimeRef.current = time;
        } else {
          firstAboveThresholdTimeRef.current = null;
          // Hold speech state for 600ms release
          if (time - lastAboveThresholdTimeRef.current <= 600) {
            isNowSpeaking = true;
          }
        }

        setIsSpeaking(isNowSpeaking);

        // Drive real mic visualizer bars in HUD
        const scaledRms = Math.min(1, rawRms * 8);
        setMicVisualLevels([
          Math.min(1, scaledRms * 1.5 + 0.05),
          Math.min(1, scaledRms * 2.2 + 0.05),
          Math.min(1, scaledRms * 3.0 + 0.05),
          Math.min(1, scaledRms * 2.0 + 0.05),
          Math.min(1, scaledRms * 1.2 + 0.05),
        ]);

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

        // Apply hybrid movement
        if (container && content && scrollVelocityMultiplierRef.current > 0.01) {
          const renderedHeight = content.scrollHeight || 1000;
          const pixelsPerWord = renderedHeight / totalWords;
          const pixelsPerSecond =
            pixelsPerWord *
            (effectiveWpm / 60) *
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
          const pixelsPerSecond = pixelsPerWord * (effectiveWpm / 60);

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
    effectiveWpm,
    totalWords,
    updateActiveLineFromScroll,
    initWebAudio,
    cleanupWebAudio,
  ]);

  // Scroll a specific line or word so it sits on the reading guide
  const scrollElementToGuide = useCallback((element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    const container = prompterContainerRef.current;
    if (!container || !element) return;

    const guideViewportY = container.clientHeight * 0.33;
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
      paceHistoryRef.current = [{ time: performance.now(), wordIndex: firstWord.globalIndex }];
    }
    const el = document.getElementById(`prompter-para-${paraIdx}`);
    scrollElementToGuide(el, 'smooth');
  };

  const handleRestartFromTop = () => {
    const container = prompterContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setActiveLineIndex(0);
    setCurrentWordIndex(0);
    targetWordIndexRef.current = 0;
    paceHistoryRef.current = [];
    setElapsedSeconds(0);
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
      setVoiceNotice('Speech recognition is not supported in this browser. Volume-based voice scrolling is rolling with your voice.');
      return;
    }

    let recognition: SpeechRecognitionInstance | null = null;
    let isDisposed = false;

    try {
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;
      recognition.maxAlternatives = 3;

      recognition.onaudiostart = () => {
        if (!isDisposed) setIsListening(true);
      };
      recognition.onspeechstart = () => {
        if (!isDisposed) setIsListening(true);
      };

      // Match processing with fuzzy equality, 4-word lookahead, and confirmation
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isDisposed) return;
        setIsListening(true);

        let finalTokens: string[] = [];
        let interimTokens: string[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const isResultFinal = res.isFinal;

          // Check top alternatives up to 3
          const topAlternatives = Math.min(3, res.length);
          for (let a = 0; a < topAlternatives; a++) {
            const transcript = res[a].transcript;
            const norm = normalizeText(transcript);
            if (isResultFinal) {
              finalTokens.push(...norm);
            } else {
              interimTokens.push(...norm);
            }
          }
        }

        const combinedTokens = finalTokens.length > 0 ? finalTokens : interimTokens;
        if (combinedTokens.length === 0) return;

        // Last 4 recognized words
        const last4 = combinedTokens.slice(-4);
        setLastRecognizedPhrase(last4.join(' '));

        const currentPos = currentWordIndexRef.current;
        const windowStart = currentPos + 1;
        const windowEnd = Math.min(tokenizedWords.length - 1, currentPos + 25);

        if (windowStart >= tokenizedWords.length) return;

        let bestCandidateIdx = -1;

        // Match sequence: accept if at least 2 of 3 consecutive words match in order within the next 25 words
        // Prefer the closest match ahead
        if (last4.length >= 2) {
          const testWindows: string[][] = [];
          if (last4.length >= 3) {
            testWindows.push([last4[0], last4[1], last4[2]]);
            if (last4.length >= 4) {
              testWindows.push([last4[1], last4[2], last4[3]]);
            }
          } else {
            testWindows.push([last4[0], last4[1]]);
          }

          for (let i = windowStart; i <= windowEnd; i++) {
            let matchedInThisPos = false;

            for (const win of testWindows) {
              const pairs: [string, string][] = [];
              if (win.length === 2) {
                pairs.push([win[0], win[1]]);
              } else {
                pairs.push([win[0], win[1]]);
                pairs.push([win[1], win[2]]);
                pairs.push([win[0], win[2]]);
              }

              for (const [w1, w2] of pairs) {
                if (fuzzyWordMatch(w1, tokenizedWords[i].normalized)) {
                  const maxLookahead = Math.min(tokenizedWords.length - 1, i + 3);
                  for (let k = i + 1; k <= maxLookahead; k++) {
                    if (fuzzyWordMatch(w2, tokenizedWords[k].normalized)) {
                      bestCandidateIdx = k;
                      matchedInThisPos = true;
                      break;
                    }
                  }
                }
                if (matchedInThisPos) break;
              }
              if (matchedInThisPos) break;
            }
            if (matchedInThisPos) break; // Prefer closest match ahead
          }
        }

        // Two-pass commit logic: commit immediately if final, or if same interim candidate appears twice
        if (bestCandidateIdx > currentPos && bestCandidateIdx < tokenizedWords.length) {
          const lastResult = event.results[event.results.length - 1];
          const isFinal = lastResult?.isFinal;

          let shouldCommit = false;
          if (isFinal) {
            shouldCommit = true;
          } else {
            if (pendingMatchRef.current.candidateIdx === bestCandidateIdx) {
              pendingMatchRef.current.count++;
              if (pendingMatchRef.current.count >= 2) {
                shouldCommit = true;
              }
            } else {
              pendingMatchRef.current = { candidateIdx: bestCandidateIdx, count: 1 };
            }
          }

          if (shouldCommit) {
            targetWordIndexRef.current = bestCandidateIdx;

            // Learn speaker's pace over last 15s
            const now = performance.now();
            paceHistoryRef.current.push({ time: now, wordIndex: bestCandidateIdx });
            paceHistoryRef.current = paceHistoryRef.current.filter((p) => now - p.time <= 15000);

            if (paceHistoryRef.current.length >= 2) {
              const first = paceHistoryRef.current[0];
              const dtMin = (now - first.time) / 60000;
              const dw = bestCandidateIdx - first.wordIndex;
              if (dtMin >= 0.05 && dw > 0) {
                const measuredWpm = dw / dtMin;
                if (measuredWpm >= 50 && measuredWpm <= 300) {
                  const baseTarget = baseWpm * speedMultiplier;
                  const blended = Math.round(0.7 * measuredWpm + 0.3 * baseTarget);
                  setDynamicWpm(Math.min(220, Math.max(80, blended)));
                }
              }
            }
          }
        }
      };

      // 4. Plain-English error reporting without breaking volume-based scrolling
      recognition.onerror = (event: any) => {
        if (isDisposed) return;
        const err = event.error;
        console.warn('SpeechRecognition error:', err, event.message);

        if (err === 'no-speech' || err === 'aborted') {
          return;
        }

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setVoiceNotice('Microphone blocked for Speech Recognition. Allow the mic or open the app in its own tab. Volume-based voice scrolling remains active.');
        } else if (err === 'network') {
          setVoiceNotice('Speech recognition service unreachable. Volume-based voice scrolling is rolling smoothly with your voice.');
        } else if (err === 'audio-capture') {
          setVoiceNotice('No microphone found.');
        } else {
          setVoiceNotice(`Speech recognition notice: ${err || 'Audio input interrupted'}. Volume scrolling active.`);
        }
      };

      recognition.onend = () => {
        if (isDisposed) return;
        if (scrollModeRef.current === 'voice' && !isPausedRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isDisposed || !recognition) return;
            if (recognitionRef.current !== recognition) return;
            if (scrollModeRef.current !== 'voice' || isPausedRef.current) return;
            try {
              recognition.start();
              setIsListening(true);
            } catch (e) {
              console.warn('Recognition restart note:', e);
            }
          }, 300);
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Speech recognition init error:', err);
      setVoiceNotice('Speech recognition not available. Volume-based voice scrolling is rolling with your voice.');
    }

    return () => {
      isDisposed = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
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
  }, [scrollMode, isPaused, speechLang, tokenizedWords, baseWpm, speedMultiplier]);

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
        setCameraError('Camera unavailable. Audio microphone recording is ready.');
      }
    } catch (err: any) {
      console.warn('Webcam getUserMedia error:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webcamStreamRef.current = audioStream;
        setUseLiveWebcam(false);
        setCameraError('Camera unavailable. Audio microphone recording is ready.');
      } catch (audioErr) {
        setUseLiveWebcam(false);
        setCameraError('Microphone and camera permissions were denied. Prompter can still roll without recording.');
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

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
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
          setCameraError('Camera unavailable. Recording audio only.');
        } catch (audioErr) {
          setCameraError('Microphone permission blocked. Cannot record.');
          return;
        }
      }
    }

    if (stream && stream.getVideoTracks().length > 0) {
      setUseLiveWebcam(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    }

    if (!stream || typeof MediaRecorder === 'undefined') {
      setCameraError('Media recording is not supported or microphone was blocked.');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const actualMime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);
        const newTakeNumber = takes.length + 1;

        const newTake: PrompterTake = {
          id: `take-${Date.now()}`,
          takeNumber: newTakeNumber,
          durationSec: elapsedSeconds,
          blob,
          url,
          mimeType: actualMime,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDownloaded: false,
        };

        setTakes((prev) => [...prev, newTake]);
        setShowTakesModal(true);
      };

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

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecordingStream();
    } else {
      setCountdown(3);
      const cdInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(cdInterval);
            setTimeout(() => {
              setCountdown(null);
              startRecordingStream();
            }, 400);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
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

  useEffect(() => {
    return () => {
      takes.forEach((t) => URL.revokeObjectURL(t.url));
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      cleanupWebAudio();
    };
  }, [takes, cleanupWebAudio]);

  const handleDownloadTake = (take: PrompterTake) => {
    const ext = take.mimeType.includes('mp4') ? 'mp4' : 'webm';
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

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMirrored((prev) => !prev);
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        setScrollMode((prev) => (prev === 'voice' ? 'auto' : 'voice'));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setBaseWpm((prev) => Math.min(220, prev + 5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setBaseWpm((prev) => Math.max(80, prev - 5));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setFontSize((prev) => Math.min(80, prev + 2));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setFontSize((prev) => Math.max(24, prev - 2));
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, takes, handleToggleRecord]);

  const handleExit = () => {
    const hasUnsavedTakes = takes.some((t) => !t.isDownloaded);

    if (hasUnsavedTakes) {
      if (!confirm('You have unsaved takes. Exit anyway?')) {
        return;
      }
    } else {
      if (!confirm('Leave Prompter Studio?')) {
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
            GET READY TO SPEAK
          </span>
          <div className="font-headline-lg font-display text-8xl sm:text-9xl text-white font-bold animate-pulse">
            {countdown}
          </div>
          <p className="mt-6 text-sm text-white/70 font-body-sm">
            Focus eyes on lens • Prompter begins automatically
          </p>
          <button
            onClick={() => setCountdown(null)}
            className="mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
          >
            Cancel Countdown (Esc)
          </button>
        </div>
      )}

      {/* TOP NOTICES */}
      {(cameraError || voiceNotice) && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-45 max-w-xl w-full px-4">
          <div className="p-3.5 rounded-xl bg-marker/95 text-ink border border-marker-border shadow-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-tertiary">info</span>
              <span>{cameraError || voiceNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {voiceNotice && (
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-2.5 py-1 rounded bg-paper-raised hover:bg-white text-ink font-semibold font-body-sm text-[11px] border border-paper-line shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Open in new browser tab for full microphone permissions"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  <span>Open in new tab</span>
                </button>
              )}
              <button
                onClick={() => {
                  setCameraError(null);
                  setVoiceNotice(null);
                }}
                className="text-ink/60 hover:text-ink cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
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

          {/* Voice vs Auto Mode Toggle */}
          <div
            className={`flex items-center rounded-full p-0.5 border text-xs font-label-meta ${
              isNightMode ? 'bg-[#2A2724] border-[#3A3631]' : 'bg-paper-sunk border-paper-line'
            }`}
          >
            <button
              onClick={() => setScrollMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                scrollMode === 'voice'
                  ? 'bg-forest text-on-forest font-semibold shadow-xs'
                  : isNightMode
                  ? 'text-[#A39E92] hover:text-[#FAF7F0]'
                  : 'text-ink-soft hover:text-ink'
              }`}
              title="Speech-responsive: moves smoothly as you speak (V)"
            >
              <span className="material-symbols-outlined text-[15px]">hearing</span>
              <span>Voice Follow</span>
              {scrollMode === 'voice' && !isPaused && isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setScrollMode('auto')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                scrollMode === 'auto'
                  ? 'bg-forest text-on-forest font-semibold shadow-xs'
                  : isNightMode
                  ? 'text-[#A39E92] hover:text-[#FAF7F0]'
                  : 'text-ink-soft hover:text-ink'
              }`}
              title="Continuous speed scroll based on WPM (V)"
            >
              <span className="material-symbols-outlined text-[15px]">speed</span>
              <span>Auto Scroll</span>
            </button>
          </div>

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
              title="Speech recognition accent/language"
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
                {isPaused
                  ? 'Paused (silence)'
                  : isSpeaking
                  ? 'Speaking'
                  : 'Listening'}
              </span>
            </div>
          )}

          {/* Recorded Takes Counter Chip */}
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
            <span className="material-symbols-outlined text-[15px]">video_library</span>
            <span>Takes: {takes.length}</span>
            {takes.some((t) => !t.isDownloaded) && (
              <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Center: Real Pacing / Progress Telemetry */}
        <div className="hidden xl:flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-label-meta ${
              isNightMode ? 'bg-[#2A2724] border-[#3A3631] text-[#FAF7F0]' : 'bg-paper-raised border-paper-line text-ink'
            }`}
          >
            <span className="text-forest font-semibold">{effectiveWpm} WPM</span>
            <span className="text-ink-faint">•</span>
            <span>{remainingSeconds > 0 ? `${formatTime(remainingSeconds)} left` : 'Finished'}</span>
            <span className="text-ink-faint">•</span>
            <span className="text-ink-soft">{progressPercent}%</span>
          </div>

          <button
            onClick={handleRestartFromTop}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-label-meta cursor-pointer transition-colors ${
              isNightMode
                ? 'bg-[#2A2724] border-[#3A3631] text-[#A39E92] hover:text-[#FAF7F0]'
                : 'bg-paper-sunk border-paper-line text-ink-soft hover:text-ink'
            }`}
            title="Scroll back to first sentence"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Restart</span>
          </button>
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
            title="Exit studio view (Esc)"
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
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
      <div className="fixed top-20 right-6 sm:right-12 z-40 w-[200px] sm:w-[240px] aspect-video rounded-xl overflow-hidden bg-night-paper shadow-2xl border-2 border-forest group transition-all duration-200 hover:scale-[1.02]">
        <div className="relative w-full h-full">
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

          <img
            alt="Studio camera speaker"
            className={`w-full h-full object-cover grayscale-[15%] contrast-105 absolute inset-0 transition-opacity duration-200 ${
              useLiveWebcam ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'
            }`}
            src={ASSETS.liveCameraSpeaker}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-night-paper/85 via-transparent to-night-paper/40 pointer-events-none z-15"></div>

          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white z-20">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rec animate-ping' : 'bg-forest'}`}></span>
            <span className="font-label-meta text-[9px] tracking-wider uppercase font-bold">
              {useLiveWebcam ? 'WEBCAM' : 'STUDIO PREVIEW'}
            </span>
          </div>

          <button
            onClick={toggleWebcam}
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-night-paper/80 text-white font-label-meta text-[10px] hover:bg-night-paper transition-colors flex items-center gap-1 cursor-pointer border border-white/20 z-20"
            title={useLiveWebcam ? 'Turn off live camera' : 'Enable local webcam'}
          >
            <span className="material-symbols-outlined text-[13px]">
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
                  {isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : 'MIC STANDBY'}
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
        style={{ top: '33vh' }}
        className="fixed left-0 right-0 z-20 pointer-events-none flex items-center justify-between px-4 sm:px-12"
      >
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-forest text-on-forest font-label-meta text-[11px] uppercase tracking-wider font-bold shadow-md opacity-90">
          <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
          <span>Reading Guide</span>
        </div>
        <div className="flex-1 mx-4 h-[1.5px] bg-gradient-to-r from-forest via-forest/60 to-transparent"></div>
        <span className="font-label-meta text-[10px] uppercase text-forest font-semibold opacity-75 hidden md:inline">
          Eyes Near Camera Axis
        </span>
      </div>

      {/* ============================================================== */}
      {/* PRIMARY PROMPTER SCROLL CONTAINER                             */}
      {/* ============================================================== */}
      <div
        ref={prompterContainerRef}
        onScroll={updateActiveLineFromScroll}
        className="h-screen overflow-y-auto w-full relative pt-[33vh] pb-[60vh] px-6 flex justify-center scroll-smooth focus:outline-none"
      >
        <div
          ref={scriptContentRef}
          style={{
            fontSize: `${fontSize}px`,
            transform: isMirrored ? 'scaleX(-1)' : 'none',
          }}
          className="w-full max-w-[28ch] flex flex-col gap-10 text-left font-prompter-reading tracking-tight leading-[1.45] transition-transform duration-200"
        >
          {paragraphs.map((para, paraIdx) => {
            const isPast = paraIdx < activeLineIndex;
            const isActive = paraIdx === activeLineIndex;

            const wordsForThisPara = tokenizedWords.filter((w) => w.paragraphIndex === paraIdx);

            return (
              <div
                id={`prompter-para-${paraIdx}`}
                key={paraIdx}
                onClick={() => handleLineClick(paraIdx)}
                className={`relative px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isNightMode
                      ? 'bg-[#2A2724] border-l-4 border-forest shadow-lg scale-[1.01]'
                      : 'bg-marker border-l-4 border-forest shadow-md scale-[1.01]'
                    : isPast
                    ? isNightMode
                      ? 'text-[#6B665C] opacity-40 hover:opacity-75'
                      : 'text-ink-faint opacity-45 hover:opacity-80'
                    : isNightMode
                    ? 'text-[#A39E92] opacity-60 hover:opacity-90'
                    : 'text-ink-soft opacity-65 hover:opacity-90'
                }`}
              >
                {isActive && (
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center text-forest">
                    <span className="material-symbols-outlined text-[24px]">arrow_right</span>
                  </div>
                )}

                <p className={`${isActive ? (isNightMode ? 'text-[#FAF7F0] font-medium' : 'text-ink font-medium') : ''}`}>
                  {wordsForThisPara.map((wordObj) => {
                    const isWordSpoken = wordObj.globalIndex < currentWordIndex;
                    const isWordActive = wordObj.globalIndex === currentWordIndex;

                    return (
                      <span
                        key={wordObj.globalIndex}
                        id={`ft-word-${wordObj.globalIndex}`}
                        className={`inline-block mr-[0.28em] transition-colors duration-150 ${
                          isWordActive
                            ? 'underline decoration-forest decoration-2 font-bold'
                            : isWordSpoken && scrollMode === 'voice'
                            ? 'opacity-60'
                            : ''
                        }`}
                      >
                        {wordObj.original}
                      </span>
                    );
                  })}
                </p>

                {isActive && (
                  <div className="mt-2 flex items-center justify-between text-xs font-label-meta text-forest pt-1 border-t border-forest/15">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">
                        {scrollMode === 'voice' ? 'hearing' : 'speed'}
                      </span>
                      <span>
                        {scrollMode === 'voice'
                          ? isSpeaking
                            ? 'Speaking (Scrolling)...'
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
                )}
              </div>
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 w-full max-w-3xl px-4">
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
              title={isRecording ? 'Stop take & save (R)' : 'Start countdown & record (R)'}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isRecording ? 'stop' : 'radio_button_checked'}
              </span>
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-4 h-11 rounded-xl transition-colors font-body-sm text-sm cursor-pointer border ${
                isPaused
                  ? 'bg-forest text-on-forest border-forest font-semibold shadow-xs'
                  : isNightMode
                  ? 'bg-[#3A3631] hover:bg-[#4A453F] text-[#FAF7F0] border-transparent'
                  : 'bg-paper-sunk hover:bg-paper-line text-ink border-paper-line/50'
              }`}
              title="Spacebar to toggle scroll"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'Roll' : 'Pause'}</span>
            </button>
          </div>

          <div className={`hidden sm:block w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}></div>

          {/* 2. Speed Mode 1 / 2 / 3 & Fine WPM Slider */}
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
              title="Fine WPM pace adjuster (Arrow Up/Down)"
            />
          </div>

          <div className={`hidden sm:block w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}></div>

          {/* 3. Display Adjustments: Font Sizing, Night Mode, Mirroring */}
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center rounded-xl p-0.5 border ${
                isNightMode ? 'bg-[#3A3631] border-transparent' : 'bg-paper-sunk border-paper-line/60'
              }`}
            >
              <button
                onClick={() => setFontSize((prev) => Math.max(24, prev - 2))}
                className="w-7 h-8 flex items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
                title="Decrease font size (-)"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="px-1.5 font-label-meta text-[11px] text-ink-faint select-none font-bold">
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((prev) => Math.min(80, prev + 2))}
                className="w-7 h-8 flex items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
                title="Increase font size (+)"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isNightMode
                  ? 'bg-marker text-ink'
                  : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Toggle Night Paper contrast"
            >
              <span className="material-symbols-outlined text-[20px]">
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
              title="Mirror text horizontally (M) for beam-splitter glass"
            >
              <span className="material-symbols-outlined text-[20px]">flip</span>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div
          className={`flex flex-wrap items-center justify-center gap-3 font-label-meta text-[11px] px-4 py-1 rounded-full backdrop-blur-sm border ${
            isNightMode
              ? 'bg-[#2A2724]/80 text-[#A39E92] border-[#3A3631]'
              : 'bg-paper/85 text-ink-soft border-paper-line/50'
          }`}
        >
          <span><kbd className="px-1 py-0.5 rounded bg-paper-raised text-ink text-[10px] font-bold border border-paper-line">Space</kbd> roll/pause</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-paper-raised text-ink text-[10px] font-bold border border-paper-line">R</kbd> record</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-paper-raised text-ink text-[10px] font-bold border border-paper-line">V</kbd> voice follow</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-paper-raised text-ink text-[10px] font-bold border border-paper-line">M</kbd> mirror</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-paper-raised text-ink text-[10px] font-bold border border-paper-line">?</kbd> shortcuts</span>
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
                <span className="material-symbols-outlined text-forest text-[22px]">video_library</span>
                <h3 className="font-headline-sm text-lg font-semibold text-ink">
                  Recorded Takes ({takes.length})
                </h3>
              </div>
              <button
                onClick={() => setShowTakesModal(false)}
                className="text-ink-soft hover:text-ink p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {takes.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <span className="material-symbols-outlined text-ink-faint text-4xl">videocam_off</span>
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
                        <span className="font-bold text-ink">Take 0{take.takeNumber}</span>
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
                        title="Preview video take"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        <span>Play</span>
                      </button>

                      <button
                        onClick={() => handleDownloadTake(take)}
                        className="p-2 rounded-lg bg-forest text-on-forest hover:bg-forest-dark font-body-sm text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Download video to computer"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Save</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTake(take.id)}
                        className="p-2 rounded-lg text-ink-faint hover:text-rec cursor-pointer transition-colors"
                        title="Delete take"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-paper-line flex items-center justify-between">
              <span className="font-label-meta text-[11px] text-ink-faint">
                Takes stay in your local browser only.
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
                <span className="font-bold text-ink">Take 0{previewTake.takeNumber} Playback</span>
                <span className="font-label-meta text-xs text-ink-soft">
                  ({formatTime(previewTake.durationSec)})
                </span>
              </div>
              <button
                onClick={() => setPreviewTake(null)}
                className="text-ink-soft hover:text-ink cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                src={previewTake.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleDeleteTake(previewTake.id)}
                className="text-rec text-xs font-medium hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Take</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadTake(previewTake)}
                  className="px-4 py-2 rounded-lg bg-forest text-on-forest font-body-sm text-sm font-medium hover:bg-forest-dark flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Download Take</span>
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
                <span className="material-symbols-outlined text-forest text-[22px]">keyboard</span>
                <h3 className="font-headline-sm text-lg font-semibold text-ink">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-ink-soft hover:text-ink cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 font-body-sm text-sm">
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Pause / Resume Prompter</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">Space</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Start 3-2-1 / Stop Take</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">R</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Toggle Voice Follow / Auto Scroll</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">V</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Mirror text (for glass rigs)</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Adjust WPM speed</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-paper-line/50">
                <span className="text-ink-soft">Font size larger / smaller</span>
                <kbd className="px-2 py-0.5 rounded bg-paper-sunk font-label-meta text-xs font-bold border border-paper-line">+ / -</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-ink-soft">Exit Prompter Studio</span>
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
