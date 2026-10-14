import React, { useState, useEffect, useRef } from 'react';
import { Script } from '../types';
import { ASSETS } from '../data/defaultScripts';

interface LivePrompterViewProps {
  script: Script;
  onExit: () => void;
  isPro?: boolean;
}

export const LivePrompterView: React.FC<LivePrompterViewProps> = ({
  script,
  onExit,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [fontSize, setFontSize] = useState(44);
  const [speedLevel, setSpeedLevel] = useState<'1' | '2' | '3'>('2');
  const [activeLineIndex, setActiveLineIndex] = useState(2);
  const [elapsedSeconds, setElapsedSeconds] = useState(84); // 01:24
  const [isRecording, setIsRecording] = useState(true);
  const [useLiveWebcam, setUseLiveWebcam] = useState(false);
  const [recordedTakesCount, setRecordedTakesCount] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Split script content into paragraphs
  const paragraphs = script.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Fallback demo lines if script is empty
  const linesToRender = paragraphs.length > 0 ? paragraphs : [
    "Welcome everyone. Today we are exploring the exact discipline behind speaking with authority on video.",
    "Most people believe you need years of stage training to hold an audience completely still.",
    "The secret to natural eye contact isn't memorising every sentence.",
    "It's having your thoughts anchored just two inches below the camera glass.",
    "When your posture stays tall and your breath slows down, the teleprompter stops feeling like a mechanical barrier.",
    "Instead, it becomes an invisible mirror for your own authentic conviction.",
    "Pause right here. Let that sink in. Notice how the room gets quiet when you aren't rushing to fill space.",
    "Take a deliberate sip of water if you need it. We will carry this momentum directly into chapter two."
  ];

  // Auto-scroll pace timer
  useEffect(() => {
    if (isPaused || !isRecording) return;

    // Milliseconds per paragraph based on WPM
    const wpm = speedLevel === '1' ? 120 : speedLevel === '2' ? 148 : 175;
    const currentText = linesToRender[activeLineIndex] || '';
    const wordCount = currentText.split(/\s+/).length || 10;
    const lineDurationMs = Math.max(3000, (wordCount / wpm) * 60 * 1000);

    const timer = setTimeout(() => {
      setActiveLineIndex((prev) => {
        if (prev < linesToRender.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, lineDurationMs);

    return () => clearTimeout(timer);
  }, [activeLineIndex, isPaused, isRecording, speedLevel, linesToRender]);

  // Scroll active line into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  // Recording counter timer
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Format recording timer
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Webcam activation
  const toggleWebcam = async () => {
    if (useLiveWebcam) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
      setUseLiveWebcam(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setUseLiveWebcam(true);
      } catch (err) {
        alert('Could not access local webcam feed. Using high-resolution studio camera preview.');
      }
    }
  };

  // Stop recording take
  const handleStopRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsPaused(true);
      alert(`Take 0${recordedTakesCount} captured (${formatTime(elapsedSeconds)}). Video saved to local browser memory.`);
      setRecordedTakesCount((prev) => prev + 1);
    } else {
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleStopRecording();
      } else if (e.code === 'KeyM') {
        setIsMirrored((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (confirm('Leave Prompter Studio? Current take will be stopped.')) {
          onExit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, recordedTakesCount, elapsedSeconds]);

  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const speedLabel =
    speedLevel === '1' ? 'Slow (120 WPM)' : speedLevel === '2' ? 'Default (Auto)' : 'Fast (175 WPM)';

  return (
    <div
      className={`min-h-screen w-full relative select-none transition-colors duration-300 ${
        isNightMode ? 'bg-[#1F1D1A] text-[#FAF7F0]' : 'bg-[#FAF7F0] text-[#1F1D1A]'
      }`}
    >
      {/* Ambient Top Reading Guide Backdrop Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-48 bg-gradient-to-b from-forest-tint/30 via-forest-tint/10 to-transparent pointer-events-none rounded-full blur-3xl"></div>

      {/* Prompter HUD / Control Header */}
      <section
        className={`sticky top-0 z-30 flex items-center justify-between py-4 px-6 md:px-12 backdrop-blur-md border-b transition-colors duration-300 ${
          isNightMode
            ? 'bg-[#1F1D1A]/90 border-[#3A3631]'
            : 'bg-[#FAF7F0]/90 border-paper-line'
        }`}
      >
        {/* Left: Status & Audio Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-rec-tint text-rec shadow-2xs">
            <span
              className={`w-2.5 h-2.5 rounded-full bg-rec ${isRecording && !isPaused ? 'animate-pulse' : ''}`}
            ></span>
            <span className="font-label-meta text-xs tracking-wider font-bold">
              {isRecording ? `REC ${formatTime(elapsedSeconds)}` : 'PAUSED'}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-label-meta ${
              isNightMode ? 'bg-[#2A2724] border-[#3A3631] text-[#A39E92]' : 'bg-paper-sunk border-paper-line text-ink-soft'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-forest">mic</span>
            <span>Built-in Mic</span>
            <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
            <span className="text-forest font-semibold">Good</span>
          </div>

          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-label-meta ${
              isNightMode ? 'bg-[#2A2724] border-[#3A3631] text-[#A39E92]' : 'bg-paper-sunk border-paper-line text-ink-faint'
            }`}
          >
            <span className="uppercase tracking-wider">Voice Tracking</span>
            <span className="text-forest font-bold">{script.pacingWpm || 148} WPM</span>
          </div>
        </div>

        {/* Center: Eye Line Alignment Guide Tag */}
        <div
          className={`hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full shadow-xs border ${
            isNightMode
              ? 'bg-[#2A2724] border-[#3A3631] text-primary-fixed'
              : 'bg-paper-raised border-paper-line text-forest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span
            className={`font-label-eyebrow text-xs uppercase tracking-widest font-semibold ${
              isNightMode ? 'text-[#FAF7F0]' : 'text-ink'
            }`}
          >
            Reading Zone • Eyes Near Camera
          </span>
          <span className="w-2 h-2 rounded-full bg-forest animate-ping opacity-75"></span>
        </div>

        {/* Right: Script Meta & Studio Exit */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="font-label-eyebrow text-[11px] uppercase text-ink-faint tracking-wider">Script Title</p>
            <p className="font-title-md text-xs font-medium max-w-[220px] truncate">{script.title}</p>
          </div>

          <button
            onClick={() => {
              if (confirm('Exit prompter session? Your audio checkpoint is saved.')) {
                onExit();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-colors font-body-sm text-xs cursor-pointer ${
              isNightMode
                ? 'border-[#3A3631] text-[#A39E92] hover:text-[#FAF7F0] hover:bg-[#2A2724]'
                : 'border-paper-line text-ink-soft hover:text-ink hover:bg-paper-sunk'
            }`}
            title="Exit studio view (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Exit Studio</span>
            <kbd className="px-1.5 py-0.5 rounded bg-paper-sunk/80 font-label-meta text-[11px] text-ink-faint border border-paper-line/50">
              Esc
            </kbd>
          </button>
        </div>
      </section>

      {/* Live Camera Video HUD PiP (Floating Top-Right) */}
      <div className="fixed top-20 right-6 sm:right-12 z-40 w-[200px] sm:w-[240px] aspect-video rounded-xl overflow-hidden bg-night-paper shadow-2xl border-2 border-rec group transition-all duration-200 hover:scale-[1.02]">
        <div className="relative w-full h-full">
          {useLiveWebcam ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img
              alt="Cinematic portrait of a thoughtful speaker looking directly into camera"
              className="w-full h-full object-cover grayscale-[15%] contrast-105"
              src={ASSETS.liveCameraSpeaker}
            />
          )}

          {/* Video Overlay Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-night-paper/85 via-transparent to-night-paper/40 pointer-events-none"></div>

          {/* Video Status Top Pill */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-rec/95 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-paper-raised animate-ping"></span>
            <span className="font-label-meta text-[9px] tracking-wider uppercase font-bold">LIVE PREVIEW</span>
          </div>

          {/* Toggle Webcam switch button */}
          <button
            onClick={toggleWebcam}
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-night-paper/80 text-white font-label-meta text-[10px] hover:bg-night-paper transition-colors flex items-center gap-1 cursor-pointer"
            title={useLiveWebcam ? 'Switch to studio photo' : 'Switch to real webcam'}
          >
            <span className="material-symbols-outlined text-[12px]">switch_video</span>
            <span>{useLiveWebcam ? 'Webcam' : '4K • 24fps'}</span>
          </button>

          {/* Realtime Audio Waveform Visualizer */}
          <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between h-4 px-1">
            <div className="w-1 bg-primary-fixed h-2 rounded-full animate-pulse"></div>
            <div className="w-1 bg-primary-fixed h-3 rounded-full animate-pulse delay-75"></div>
            <div className="w-1 bg-primary-fixed h-4 rounded-full animate-pulse delay-100"></div>
            <div className="w-1 bg-primary-fixed h-2.5 rounded-full animate-pulse delay-150"></div>
            <div className="w-1 bg-primary-fixed h-3.5 rounded-full animate-pulse"></div>
            <div className="w-1 bg-primary-fixed h-1.5 rounded-full animate-pulse delay-200"></div>
            <div className="w-1 bg-primary-fixed h-3 rounded-full animate-pulse delay-75"></div>
            <div className="w-1 bg-primary-fixed h-4 rounded-full animate-pulse"></div>
            <div className="w-1 bg-primary-fixed h-2 rounded-full animate-pulse delay-100"></div>
            <span className="font-label-meta text-[9px] text-[#A39E92] ml-1">AUDIO OK</span>
          </div>
        </div>
      </div>

      {/* Primary Prompter Text Reading Canvas */}
      <main className="relative flex flex-col items-center justify-start w-full pt-8 pb-48 px-6">
        {/* Camera Level Visual Guide Line */}
        <div className="w-full max-w-4xl flex items-center justify-between mb-8 opacity-45 px-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-forest to-forest"></div>
          <div className="px-4 py-1 flex items-center gap-2 text-forest font-label-meta text-[11px] uppercase tracking-widest font-semibold">
            <span className="material-symbols-outlined text-[14px]">videocam</span>
            <span>Camera Centerline Axis</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-forest to-forest"></div>
        </div>

        {/* Script Flow Stream (Strictly Centered 28ch Column for Lens Alignment) */}
        <div
          style={{
            fontSize: `${fontSize}px`,
            transform: isMirrored ? 'scaleX(-1)' : 'none',
          }}
          className="w-full max-w-[28ch] flex flex-col gap-9 text-left font-prompter-reading tracking-tight leading-[1.45] transition-all duration-300"
        >
          {linesToRender.map((para, idx) => {
            const isPast = idx < activeLineIndex;
            const isActive = idx === activeLineIndex;
            const isUpcoming = idx > activeLineIndex;

            if (isActive) {
              return (
                <div
                  ref={activeLineRef}
                  key={idx}
                  className="relative -mx-6 px-6 py-4 rounded-r-xl bg-marker border-l-4 border-forest shadow-md transition-all duration-300 transform scale-[1.01] cursor-pointer"
                >
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center text-forest animate-pulse">
                    <span className="material-symbols-outlined text-[24px]">arrow_right_alt</span>
                  </div>
                  <p className="text-ink font-medium select-text">{para}</p>
                  {/* Real-time pacing indicator dot */}
                  <div className="absolute right-4 bottom-2 flex items-center gap-1.5">
                    <span className="font-label-meta text-[11px] text-ink-soft uppercase tracking-wider font-semibold">
                      Syncing Voice
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping"></span>
                  </div>
                </div>
              );
            }

            if (isPast) {
              return (
                <p
                  key={idx}
                  onClick={() => setActiveLineIndex(idx)}
                  className={`transition-colors duration-300 cursor-pointer ${
                    isNightMode
                      ? 'text-[#6B665C] hover:text-[#A39E92]'
                      : 'text-ink-faint hover:text-ink-soft'
                  }`}
                >
                  {para}
                </p>
              );
            }

            return (
              <p
                key={idx}
                onClick={() => setActiveLineIndex(idx)}
                className={`transition-colors duration-300 cursor-pointer ${
                  idx === activeLineIndex + 1
                    ? isNightMode
                      ? 'text-[#FAF7F0] opacity-90'
                      : 'text-ink-soft opacity-85 hover:opacity-100'
                    : isNightMode
                    ? 'text-[#A39E92] opacity-40 hover:opacity-75'
                    : 'text-ink-faint opacity-40 hover:opacity-75'
                }`}
              >
                {para}
              </p>
            );
          })}

          <div className="pt-12 pb-24 text-center">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-meta text-xs uppercase tracking-widest border ${
                isNightMode
                  ? 'bg-[#2A2724] border-[#3A3631] text-[#6B665C]'
                  : 'bg-paper-sunk border-paper-line text-ink-faint'
              }`}
            >
              • End of Script Draft •
            </span>
          </div>
        </div>
      </main>

      {/* Floating Teleprompter HUD Control Dock (Bottom Center) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 w-full max-w-2xl px-4">
        {/* Glassmorphic Paper Control Console */}
        <div
          className={`flex items-center justify-between gap-3 w-full px-5 py-3 rounded-2xl shadow-[0_8px_28px_rgba(31,29,26,0.14)] border transition-colors ${
            isNightMode
              ? 'bg-[#2A2724]/95 border-[#3A3631] text-[#FAF7F0]'
              : 'bg-paper-raised/95 border-paper-line text-ink'
          }`}
        >
          {/* Record / Stop Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStopRecording}
              className="w-11 h-11 rounded-lg bg-rec hover:bg-rec/90 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
              title={isRecording ? 'Stop take & save (R)' : 'Start new take (R)'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isRecording ? 'stop' : 'radio_button_checked'}
              </span>
            </button>

            {/* Pause / Resume Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-3.5 h-11 rounded-lg transition-colors font-body-sm text-sm cursor-pointer border ${
                isPaused
                  ? 'bg-marker text-ink border-marker-border font-semibold'
                  : isNightMode
                  ? 'bg-[#3A3631] hover:bg-[#4A453F] text-[#FAF7F0] border-transparent'
                  : 'bg-paper-sunk hover:bg-paper-line text-ink border-paper-line/50'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          </div>

          {/* Vertical Divider */}
          <div
            className={`w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}
          ></div>

          {/* Voice Sensitivity Slider & Stops */}
          <div className="flex flex-col gap-1 flex-1 max-w-[190px]">
            <div
              className={`flex justify-between items-center font-label-meta text-[11px] ${
                isNightMode ? 'text-[#A39E92]' : 'text-ink-soft'
              }`}
            >
              <span
                onClick={() => setSpeedLevel('1')}
                className="hover:text-forest cursor-pointer"
              >
                Slow
              </span>
              <span className="text-forest font-bold">{speedLabel}</span>
              <span
                onClick={() => setSpeedLevel('3')}
                className="hover:text-forest cursor-pointer"
              >
                Fast
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={speedLevel}
              onChange={(e) => setSpeedLevel(e.target.value as '1' | '2' | '3')}
              className="w-full h-1.5 bg-paper-sunk rounded-lg appearance-none cursor-pointer accent-forest"
            />
          </div>

          {/* Vertical Divider */}
          <div
            className={`w-[1px] h-7 ${isNightMode ? 'bg-[#3A3631]' : 'bg-paper-line'}`}
          ></div>

          {/* Display Adjustments: Font Sizing, Dark Theme, Mirroring */}
          <div className="flex items-center gap-1">
            {/* Font Size Controls */}
            <div
              className={`flex items-center rounded-lg p-0.5 border ${
                isNightMode ? 'bg-[#3A3631] border-transparent' : 'bg-paper-sunk border-paper-line/60'
              }`}
            >
              <button
                onClick={() => setFontSize((prev) => Math.max(30, prev - 2))}
                className="w-7 h-8 flex items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
                title="Decrease font size"
              >
                <span className="material-symbols-outlined text-[16px]">text_decrease</span>
              </button>
              <span className="px-1.5 font-label-meta text-[11px] text-ink-faint select-none">
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((prev) => Math.min(60, prev + 2))}
                className="w-7 h-8 flex items-center justify-center rounded text-ink-soft hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
                title="Increase font size"
              >
                <span className="material-symbols-outlined text-[16px]">text_increase</span>
              </button>
            </div>

            {/* Night Paper Mode Toggle */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isNightMode
                  ? 'bg-marker text-ink'
                  : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Toggle Night Paper high contrast theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isNightMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Mirror Mode (For physical beam-splitter teleprompter rigs) */}
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isMirrored
                  ? 'bg-forest text-on-forest'
                  : 'hover:bg-paper-sunk text-ink-soft hover:text-ink'
              }`}
              title="Mirror text horizontally (M) for beam-splitter prompter glass"
            >
              <span className="material-symbols-outlined text-[20px]">flip</span>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Footer */}
        <div
          className={`flex items-center gap-3 font-label-meta text-[11px] px-3.5 py-1 rounded-full backdrop-blur-sm border ${
            isNightMode
              ? 'bg-[#2A2724]/80 text-[#A39E92] border-[#3A3631]'
              : 'bg-paper/85 text-ink-soft border-paper-line/50'
          }`}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-paper-raised border border-paper-line-strong text-ink text-[10px]">
              Space
            </kbd>{' '}
            to pause
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-paper-raised border border-paper-line-strong text-ink text-[10px]">
              R
            </kbd>{' '}
            to stop
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-paper-raised border border-paper-line-strong text-ink text-[10px]">
              M
            </kbd>{' '}
            to mirror
          </span>
          <span>•</span>
          <span className="text-ink-faint">Click any line to jump</span>
        </div>
      </div>
    </div>
  );
};
