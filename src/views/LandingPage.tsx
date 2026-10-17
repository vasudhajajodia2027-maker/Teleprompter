import React, { useState, useEffect } from 'react';
import { ASSETS } from '../data/defaultScripts';

interface LandingPageProps {
  onNavigate: (view: 'overview' | 'scripts' | 'editor' | 'prompter' | 'pricing' | 'checkout') => void;
  onOpenScriptEditor: (scriptId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeDemoLine, setActiveDemoLine] = useState(1);
  const [audioMeterHeights, setAudioMeterHeights] = useState([8, 14, 6, 4]);

  // Audio flutter animation for the demo workstation
  useEffect(() => {
    const timer = setInterval(() => {
      setAudioMeterHeights([
        Math.floor(Math.random() * 8) + 4,
        Math.floor(Math.random() * 12) + 4,
        Math.floor(Math.random() * 10) + 4,
        Math.floor(Math.random() * 6) + 2,
      ]);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const demoLines = [
    {
      text: "Most prompters scroll at a fixed speed, so you have to keep up.",
    },
    {
      text: "First Take waits until you say the words, so you can pause when you need to.",
      highlight: "you say the words",
    },
    {
      text: "You look into the lens and breathe between sentences, with no speed setting to manage.",
    },
    {
      text: "When you stop speaking, the script stops scrolling.",
    },
  ];

  const handleBuy = () => {
    onNavigate('checkout');
  };

  return (
    <div className="flex flex-col w-full text-ink">
      {/* 1. HERO SECTION */}
      <section className="relative px-6 lg:px-12 pt-12 pb-16 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* Display Headline */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl tracking-tight text-ink max-w-3xl leading-[1.05]">
            A teleprompter that{' '}
            <mark className="bg-marker text-on-marker px-2.5 py-0.5 rounded-none font-normal italic inline-block">
              listens
            </mark>
            .
          </h1>

          {/* Lead Narrative */}
          <p className="font-lead text-lg sm:text-xl text-ink-soft max-w-2xl leading-relaxed">
            The text follows your voice, so you can record in fewer takes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('prompter')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-forest text-on-forest font-title-md text-base hover:bg-forest-dark transition-all duration-150 text-center font-medium shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              Try it free
            </button>
            <a
              href="#demo-workstation"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-paper-raised text-ink font-title-md text-base hover:bg-paper-sunk transition-colors duration-150 text-center font-medium border border-paper-line cursor-pointer"
            >
              See how it works
            </a>
          </div>

          {/* Subtext under hero button - says 'nothing is uploaded' once */}
          <p className="font-label-meta text-xs text-ink-faint pt-1">
            Runs in your browser. Free demo, no account needed. Your videos stay on your computer.
          </p>
        </div>

        {/* 2. DEMO WORKSTATION */}
        <div className="mt-14 max-w-4xl mx-auto w-full" id="demo-workstation">
          <div className="bg-paper-raised rounded-xl overflow-hidden border border-paper-line shadow-sm hover:shadow-md transition-shadow">
            {/* Prompter Machine Top Chrome */}
            <div className="bg-paper-sunk px-5 py-3.5 flex items-center justify-between gap-4 border-b border-paper-line">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-forest-tint text-forest font-label-meta text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-forest animate-pulse"></span>
                  Ready
                </span>
                <span className="font-label-meta text-xs text-ink-soft hidden sm:inline">
                  Take 01 — "Pitch_Update.txt"
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Audio Meter Indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-paper-raised border border-paper-line/50">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-forest">mic</span>
                  <div className="flex items-end gap-0.5 h-3.5 w-12">
                    <span 
                      className="w-1 bg-forest rounded-full transition-all duration-150" 
                      style={{ height: `${audioMeterHeights[0]}px` }}
                    ></span>
                    <span 
                      className="w-1 bg-forest rounded-full transition-all duration-150" 
                      style={{ height: `${audioMeterHeights[1]}px` }}
                    ></span>
                    <span 
                      className="w-1 bg-forest rounded-full transition-all duration-150" 
                      style={{ height: `${audioMeterHeights[2]}px` }}
                    ></span>
                    <span 
                      className="w-1 bg-paper-line-strong rounded-full transition-all duration-150" 
                      style={{ height: `${audioMeterHeights[3]}px` }}
                    ></span>
                  </div>
                </div>

                {/* Font / Window Scale Controls */}
                <div className="flex items-center gap-1 text-ink-soft">
                  <button 
                    onClick={() => onNavigate('prompter')} 
                    className="p-1 rounded hover:bg-paper-raised hover:text-ink text-sm font-label-meta cursor-pointer"
                  >
                    44px
                  </button>
                  <span className="text-paper-line-strong">|</span>
                  <button 
                    onClick={() => onNavigate('prompter')} 
                    className="p-1 rounded hover:bg-paper-raised hover:text-ink cursor-pointer"
                    title="Prompter Settings"
                    aria-label="Prompter Settings"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Working Canvas Area with Floating Speaker Thumbnail */}
            <div className="relative p-8 sm:p-14 bg-paper-raised min-h-[440px] flex flex-col justify-center">
              {/* Live Camera Preview PiP Inset */}
              <div className="absolute top-6 right-6 w-36 sm:w-48 rounded-lg overflow-hidden bg-paper-sunk z-10 border border-paper-line shadow-lg">
                <div className="relative aspect-video bg-night-paper">
                  <img
                    alt="Speaker looking directly into the camera lens in clean studio lighting"
                    className="w-full h-full object-cover opacity-90"
                    src={ASSETS.creatorStudio}
                  />
                  {/* Rec indicator chip on webcam */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-night-paper/80 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-rec animate-pulse"></span>
                    <span className="font-label-meta text-[10px] text-night-ink uppercase tracking-wider font-semibold">
                      CAM 01
                    </span>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-paper-sunk flex items-center justify-between text-ink-soft">
                  <span className="font-label-meta text-[11px]">Live Camera</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">videocam</span>
                </div>
              </div>

              {/* Script Flow: Past, Active, Upcoming */}
              <div className="max-w-[34ch] mx-auto space-y-7 select-none">
                {demoLines.map((line, idx) => {
                  const isPast = idx < activeDemoLine;
                  const isActive = idx === activeDemoLine;

                  if (isActive) {
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveDemoLine(idx)}
                        className="relative pl-5 py-2 -ml-5 bg-marker-soft/70 rounded-r transition-all duration-300 cursor-pointer"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-forest"></div>
                        <p className="font-headline-md text-2xl sm:text-3xl text-ink tracking-tight font-medium leading-snug">
                          {line.text.includes(line.highlight || '') ? (
                            <>
                              First Take waits until{' '}
                              <mark className="bg-marker px-1.5 py-0.5 rounded-none font-medium">
                                you say the words
                              </mark>
                              , so you can pause when you need to.
                            </>
                          ) : (
                            line.text
                          )}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-forest font-label-meta text-xs">
                          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">hearing</span>
                          <span>The text follows your voice as you speak</span>
                        </div>
                      </div>
                    );
                  }

                  if (isPast) {
                    return (
                      <p
                        key={idx}
                        onClick={() => setActiveDemoLine(idx)}
                        className="font-body-lg text-lg sm:text-xl text-ink-faint line-through decoration-paper-line-strong hover:text-ink-soft transition-colors cursor-pointer"
                      >
                        {line.text}
                      </p>
                    );
                  }

                  return (
                    <p
                      key={idx}
                      onClick={() => setActiveDemoLine(idx)}
                      className={`font-body-lg text-lg sm:text-xl transition-all cursor-pointer ${
                        idx === activeDemoLine + 1
                          ? 'text-ink-soft opacity-75 hover:text-ink hover:opacity-100'
                          : 'text-ink-faint opacity-45 hover:opacity-80'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>

              {/* Prompt Controls Underlay Bar */}
              <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-ink-soft border-t border-paper-line/50 text-xs font-label-meta gap-2">
                <div className="flex items-center gap-3">
                  <span>SCRIPT WAITS WHEN YOU PAUSE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
                  <span>VIDEO: SAVED ON YOUR DEVICE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM VS SOLUTION (Old way vs First Take) */}
      <section className="px-6 lg:px-12 py-20 max-w-7xl mx-auto w-full border-t border-paper-line">
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
          <span className="font-label-eyebrow text-xs text-forest uppercase tracking-widest font-semibold">
            THE PROBLEM WITH FIXED-SPEED PROMPTERS
          </span>
          <h2 className="font-headline-lg text-3xl sm:text-4xl text-ink font-display">
            Fixed-speed prompters don't wait for you.
          </h2>
          <p className="font-body-md text-base text-ink-soft">
            Most prompters scroll at a set number of words per minute. If you stumble or stop to think, the text keeps moving and you lose your place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Old way */}
          <div className="bg-paper-sunk rounded-xl p-8 lg:p-10 flex flex-col justify-between border border-paper-line">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-rec-tint text-rec font-label-meta text-xs font-semibold">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
                Fixed-speed prompter
              </div>
              <h3 className="font-headline-sm text-xl font-semibold text-ink">The text sets the pace.</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-rec text-[20px] shrink-0 mt-0.5">remove_circle_outline</span>
                  <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                    You read at the prompter's speed, with no room to pause for effect.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-rec text-[20px] shrink-0 mt-0.5">remove_circle_outline</span>
                  <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                    Changing the speed takes a foot pedal or a handheld clicker, which pulls your attention away from what you're saying.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-rec text-[20px] shrink-0 mt-0.5">remove_circle_outline</span>
                  <p className="font-body-sm text-sm text-ink-soft leading-relaxed">
                    Many online recorders upload your takes to their servers.
                  </p>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6">
              <div className="p-4 rounded-lg bg-paper-raised text-ink-soft font-label-meta text-xs border border-paper-line/50">
                Result: more retakes, and more editing afterwards.
              </div>
            </div>
          </div>

          {/* First Take */}
          <div className="bg-paper-raised rounded-xl p-8 lg:p-10 flex flex-col justify-between border border-forest/30 shadow-sm">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-forest-tint text-forest font-label-meta text-xs font-semibold">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                First Take
              </div>
              <h3 className="font-headline-sm text-xl font-semibold text-ink">Your voice sets the pace.</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <p className="font-body-sm text-sm text-ink leading-relaxed">
                    The app listens through your microphone and highlights the word you're on.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <p className="font-body-sm text-sm text-ink leading-relaxed">
                    If you pause, cough, or go off script, the text waits where you left off.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <p className="font-body-sm text-sm text-ink leading-relaxed">
                    Video is recorded and saved right in your browser. It never goes to our servers.
                  </p>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6">
              <div className="p-4 rounded-lg bg-marker-soft text-ink font-label-meta text-xs border border-marker-border/40">
                Result: you read at your own pace and pause when you need to.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THREE STEPS */}
      <section className="px-6 lg:px-12 py-20 bg-paper-sunk w-full border-t border-paper-line" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-2">
              <span className="font-label-eyebrow text-xs text-forest uppercase tracking-widest font-semibold">
                HOW IT WORKS
              </span>
              <h2 className="font-headline-lg text-3xl sm:text-4xl text-ink font-display">
                Three steps from script to video.
              </h2>
            </div>
            <p className="font-body-md text-base text-ink-soft max-w-md leading-relaxed">
              Try it without an account or any setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 01 */}
            <div className="bg-paper-raised p-8 rounded-xl flex flex-col justify-between space-y-8 border border-paper-line shadow-xs">
              <div>
                <span className="font-label-meta text-[32px] font-bold text-ink-faint">01</span>
                <h3 className="font-headline-sm text-xl text-ink font-semibold mt-4">Paste your script</h3>
                <p className="font-body-sm text-sm text-ink-soft mt-3 leading-relaxed">
                  Paste your script, or import a .txt or .md file. The prompter shows it in a large serif font. Notes to yourself in [brackets] stay on screen, and you don't have to read them aloud.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-paper-sunk font-label-meta text-xs text-ink-soft flex items-center justify-between border border-paper-line/50">
                <span>Supports .txt • .md</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">content_paste</span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="bg-paper-raised p-8 rounded-xl flex flex-col justify-between space-y-8 border border-paper-line shadow-xs">
              <div>
                <span className="font-label-meta text-[32px] font-bold text-forest">02</span>
                <h3 className="font-headline-sm text-xl text-ink font-semibold mt-4">Press record &amp; speak</h3>
                <p className="font-body-sm text-sm text-ink-soft mt-3 leading-relaxed">
                  Click the red record button. After a 3-second countdown, recording starts, and the highlight moves forward as you say each word.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-marker-soft font-label-meta text-xs text-ink flex items-center justify-between border border-marker-border/40">
                <span className="font-medium">Follows your words</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-forest">mic</span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="bg-paper-raised p-8 rounded-xl flex flex-col justify-between space-y-8 border border-paper-line shadow-xs">
              <div>
                <span className="font-label-meta text-[32px] font-bold text-ink-faint">03</span>
                <h3 className="font-headline-sm text-xl text-ink font-semibold mt-4">Download your take</h3>
                <p className="font-body-sm text-sm text-ink-soft mt-3 leading-relaxed">
                  Click stop to watch the take, then download it as a video file: WebM in Chrome and Edge, MP4 in Safari. There's no watermark.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-paper-sunk font-label-meta text-xs text-ink-soft flex items-center justify-between border border-paper-line/50">
                <span>Saves to your Downloads folder</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION (One Card Only) */}
      <section className="w-full py-24 px-6 lg:px-12 border-t border-paper-line" id="pricing">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-tint text-forest font-label-eyebrow text-xs uppercase tracking-widest font-semibold">
              Pricing
            </div>
            <h2 className="font-headline-lg text-3xl sm:text-4xl text-ink font-display">
              Reserve the early price.
            </h2>
            <p className="font-body-sm text-sm text-ink-soft">
              Buying opens soon. Join the list now to get ₹199 / $2 when it does. Nothing to pay today.
            </p>
          </div>

          {/* Single Card */}
          <div className="p-8 sm:p-10 rounded-2xl bg-paper-raised border-2 border-forest shadow-xl text-left space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-forest-tint/50 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-paper-line pb-6">
              <div>
                <h3 className="font-headline-lg text-2xl sm:text-3xl font-display text-ink font-semibold">
                  First Take
                </h3>
                <p className="font-body-sm text-sm text-ink-soft mt-1 leading-relaxed">
                  Unlimited scripts, unlimited recording, every future update. No subscription.
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="font-display text-4xl sm:text-5xl font-bold text-ink">₹199</span>
                <span className="font-label-meta text-xs text-ink-soft">/ $2 · early price, paid once</span>
              </div>
            </div>

            <ul className="space-y-3.5 font-body-sm text-sm text-ink">
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                <span>Unlimited scripts in your library</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                <span>Unlimited recording takes</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                <span>Record with your camera and download the video</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                <span>Dark background, and mirrored text for teleprompter glass</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-forest text-[20px] shrink-0 mt-0.5">check_circle</span>
                <span>Every future update included</span>
              </li>
            </ul>

            <div className="pt-4 space-y-3 text-center">
              <button
                onClick={handleBuy}
                className="w-full py-4 px-6 rounded-lg bg-forest text-on-forest font-title-md text-base font-semibold hover:bg-forest-dark transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Reserve the early price</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">bolt</span>
              </button>
              <p className="font-label-meta text-xs text-ink-soft">
                Try the free demo first. No sign-up needed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
