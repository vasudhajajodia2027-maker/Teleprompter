# First Take — 10-day launch plan

**Window:** Day 1 = Wed 28 Oct 2026 → Day 10 = Fri 6 Nov 2026
**Time budget:** 30 minutes a day, solo founder, ₹0 ad spend
**Goal:** 1,000 users (First Take is B2C, so the B2C target applies)

---

## 1. The goal, defined so it can be counted

First Take has no account wall, so "user" has to be an action, not a signup.

| Metric | Definition | 10-day target |
|---|---|---|
| **User (north star)** | A person who presses record at least once in the demo | **1,000** |
| Visitor | Unique visitor in Clarity | ~3,000 (assumes ~33% press record) |
| Waitlist email | Row in the Supabase `waitlist` table | 120 (~12% of users) |

**Honest read:** 1,000 in 10 days on 30 min/day is doable but not likely by default. The plan below adds up to roughly 500–1,500 users. Getting to 1,000 needs one of three bets to land well: a Reddit post, Product Hunt, or Show HN. That's why all three are in the plan. No single channel has to carry it.

**Count users by source.** Every link you share gets a `?ref=` tag (`?ref=reddit-newtubers`, `?ref=ph`, `?ref=hn`, `?ref=li`, `?ref=dm`). Clarity shows the full landing URL, so you can filter by it.

---

## 2. ICP — who this is for

**Primary ICP: the solo talking-head creator.**
Someone who records a scripted, to-camera video at least once a week, alone, on a laptop or phone, without a crew or a hardware prompter.

- **Who:** small YouTubers and Shorts/Reels creators (under 10k subs), course creators and online tutors, founders recording product demos and investor updates, LinkedIn creators.
- **Trigger moment:** they've just done take 7 of a 60-second video because they kept losing their place or looking down at notes.
- **What they've tried:** reading off a second window, free fixed-speed prompter sites, phone prompter apps like PromptSmart or BIGVU (subscriptions, often $10+/month).
- **Why First Take wins for them:** the text waits when they pause, the video never leaves their device, and it costs ₹199/$2 once instead of a subscription.
- **Where they hang out:** r/NewTubers, r/youtubers, r/SideProject, YouTube creator Twitter/X, LinkedIn, Product Hunt.

**Secondary ICP (reachable through the same posts):** job seekers recording video intros, and teachers recording lessons. Don't target them directly in 10 days. Just make sure the demo video shows a use case they'd recognise.

**Not the ICP right now:** pro studios with hardware prompters, and teams buying for a company (B2B). Both need features and sales effort you don't have time for in this window.

**Problem size × frequency:** a medium-sized problem felt often (every recording session). Frequent pain makes word of mouth work. The low one-off price means paid ads can never pay back, so this plan is organic only.

---

## 3. Channels — picked, and skipped

| Channel | Why | Expected users | Effort |
|---|---|---|---|
| **Reddit** (3 posts) | The ICP asks "how do I stop messing up takes?" here every week. A demo GIF of the text waiting for you is a strong post. | 200–500 | Medium |
| **Product Hunt** (Day 8) | Free demo + no signup + a $2 price is an easy upvote. | 150–350 | High on one day |
| **Show HN** (Day 9) | "Runs in the browser, video never leaves the device, voice-following in a web app" is the kind of build HN likes. High variance. | 50–600 | Low |
| **Micro-creator DMs** (10/day) | Small YouTubers who just posted a talking-head video. Offer free lifetime access for honest feedback. Each yes reaches their audience too. | 30–100 | Low, daily |
| **LinkedIn** (3 posts, building in public) | Founders and course creators are on LinkedIn. Your own network gives the first 50 users and early feedback. | 50–150 | Low |
| **Directories** (AlternativeTo, SaaSHub, Uneed, etc.) | These keep sending traffic long after 10 days. List First Take as an alternative to PromptSmart and BIGVU. | 20–50 now, more later | One-time |

**Skipped, and why:**
- **Paid ads:** a $2 one-time price can't cover any realistic cost per user. Come back to this if pricing changes.
- **SEO and blog content:** good long-term, but too slow to help in 10 days. Start it in week 3.
- **Paid influencers:** no budget, and free-access DMs get most of the same benefit.
- **B2B and cold email:** wrong buyer for this product and this window.

---

## 4. One asset, many returns: the demo video

Everything in this plan uses one 45–60 second video, **recorded with First Take itself, in one take**. The hook is in the video: *"I recorded this in one take. Watch the text."*

Show: the script on screen → you start talking → the highlight follows you → you pause mid-sentence to drink water or think, and the text **waits** → you carry on → stop → download. Put a split-screen caption over the pause: "fixed-speed prompters keep scrolling here."

Cut it into:
- a 10–15s GIF/MP4 of just the pause moment (for Reddit, X, and the PH gallery)
- the full vertical version (Reels, Shorts, LinkedIn)
- 3 stills (PH gallery, AlternativeTo listing)

---

## 5. Day-by-day plan

Each day adds up to 30 minutes or less. If a day runs over, cut the last item and don't push it to the next day.

### Day 0 — Today (Tue 27 Oct) · Tracking ✅ built
- `?ref=` is saved for the browser tab and stored with each waitlist email. **Run `supabase/migrations/003_waitlist_ref.sql` in the Supabase SQL editor before you deploy.** Until you do, emails still save, just without the ref.
- A Clarity `take_started` event fires each time recording starts, tagged with `ref`. In Clarity: filter by Custom event = take_started, and split by the `ref` custom tag.
- Clarity only counts visitors who accepted the cookie banner, so treat its numbers as a minimum.

### Day 1 — Wed 28 Oct · Foundation
- **20 min:** write the 60s demo script and record it in First Take. Take the best of 3, but the goal is one take.
- **10 min:** in a note, list 5 subreddits and read each one's self-promotion rules. Note which ones only allow promotion in a weekly thread and when that thread opens.

### Day 2 — Thu 29 Oct · Cut the asset, post on LinkedIn
- **15 min:** cut the 15s pause clip and the vertical version (CapCut or Clipchamp).
- **15 min:** **LinkedIn post #1**, building in public: why you built it (your own retakes), the clip, the link `?ref=li`. Ask: "What's the most takes you've needed for one video?"

### Day 3 — Fri 30 Oct · First Reddit post
- **15 min:** **Reddit #1 → r/SideProject** (it allows self-promotion, so it's the lowest-risk first test). Draft below.
- **15 min:** reply to every comment in the first 2 hours. Write down every objection; they become your FAQ.

### Day 4 — Sat 31 Oct · Directories + first DMs
- **15 min:** submit to AlternativeTo (as an alternative to PromptSmart, BIGVU, and Teleprompter Premium), SaaSHub, and Uneed.
- **15 min:** **DM 10 micro-creators.** Find them by searching YouTube for "how to talk to camera" or "teleprompter", filtering to this week, under 10k subs. Template below.

### Day 5 — Sun 1 Nov · Main Reddit post
- **20 min:** **Reddit #2 → r/NewTubers** (or the weekly self-promo thread if the rules require it). Frame it as a creator tip, not an ad: *"Fixed-speed prompters made my takes worse. What fixed it for me was a prompter that waits when I pause."* Clip first, link in a comment.
- **10 min:** reply to comments, and send 5 DMs.

### Day 6 — Mon 2 Nov · Product Hunt prep
- **20 min:** schedule the Product Hunt launch for Day 8: tagline, gallery (clip + 3 stills), first comment (draft below). Set "Maker" correctly.
- **10 min:** message 20–30 people you know (WhatsApp/LinkedIn): "launching on PH Wednesday, I'd love honest feedback." Ask for feedback, not upvotes. Asking for upvotes breaks PH rules and gets launches penalised.

### Day 7 — Tue 3 Nov · Warm up
- **15 min:** **LinkedIn post #2:** the numbers so far ("X people recorded a take this week, here's what they told me"). Mention PH tomorrow.
- **15 min:** 10 DMs, and follow up with anyone who said yes on Day 4.

### Day 8 — Wed 4 Nov · 🚀 Product Hunt launch
- PH resets at 12:01am Pacific, which is **12:31pm IST**. Go live then.
- **10 min at launch:** post the first comment, and share the link (`?ref=ph`) on LinkedIn, X, and WhatsApp.
- **20 min spread through the day:** reply to every PH comment within the hour. This is the one day it's worth going over 30 minutes if you can.

### Day 9 — Thu 5 Nov · Show HN
- **10 min:** post **Show HN** around 8–9am US Eastern (**6:30–7:30pm IST**). Title below. Link straight to the demo.
- **20 min:** stay in the thread. HN will ask technical questions (speech API, browser support, privacy). Answer plainly and admit the limits (for example, browsers without speech recognition).

### Day 10 — Fri 6 Nov · Results + the next loop
- **10 min:** **Reddit #3 → r/youtubers or r/InternetIsBeautiful** (free demo, no signup, so it fits that sub; check its rules first). Use the best-performing angle from posts #1 and #2.
- **10 min:** pull the numbers: users, visitors, and waitlist emails by `ref`.
- **10 min:** **LinkedIn post #3:** the launch retro with real numbers. Retros tend to do better than launch posts.

---

## 6. Drafts to copy and adjust

**Reddit (r/SideProject)**
> **I built a teleprompter that waits when you pause**
> I kept doing 6–8 takes for 60-second videos because fixed-speed prompters scroll whether you're ready or not. So I made one that listens: the text follows your voice and stops when you stop.
> It runs in the browser, there's no account, and the video stays on your computer. [clip]
> Free demo: getfirsttake.app/?ref=reddit-sp
> What would make you actually use this for your videos?

**Micro-creator DM**
> Hey [name], I watched your [video title]. The part about [specific thing] was great. I'm building First Take, a teleprompter that follows your voice and waits when you pause, so you don't have to rerecord when you lose your place. Would you try it for your next video? Happy to give you lifetime access free. I just want honest feedback. getfirsttake.app/?ref=dm

**Product Hunt**
- Name: First Take
- Tagline: *A teleprompter that waits when you pause*
- First comment: why you built it (your retakes) → what it does in 3 bullets (follows your voice / waits when you pause / video stays on your device) → the ₹199/$2 early price for people on the list → "What would you record with it?"

**Show HN**
> Show HN: First Take – a browser teleprompter that scrolls with your voice

Body: 4–5 lines. What it is, how it works (speech recognition in the browser, recording with MediaRecorder, nothing uploaded), what doesn't work yet, and a link.

---

## 7. Fix these before Day 3 (activation)

Traffic doesn't help if people leave before pressing record. Check these with the demo:

1. **Browser support.** Voice-following depends on the browser's speech recognition, which Firefox doesn't have. Make sure unsupported browsers see a clear message ("Voice follow works in Chrome, Edge and Safari") rather than a prompter that silently doesn't move.
2. **Mic permission.** The first visit asks for camera and mic. One line explaining why, before the browser prompt appears, cuts drop-off.
3. **Pre-filled script.** The demo should open with a short sample script so a visitor can press record within 10 seconds, without having to write anything.
4. **Waitlist ask after the first take.** After someone downloads their first take, that's the moment to ask for their email: "Keep your scripts and get the ₹199/$2 price."

---

## 8. Daily scoreboard (2 minutes, every evening)

| Day | Visitors | Users (pressed record) | Waitlist | Top `ref` | Note |
|---|---|---|---|---|---|
| 1 | | | | | |
| … | | | | | |
| 10 | | | | | |

**Kill / double-down rule:** if a Reddit post gets over 100 users, post the same angle in the next sub on the list the next day instead of the planned item. If a channel brings fewer than 10 users from two attempts, drop it for the rest of the 10 days.

---

## 9. Open questions

- **Is "pressed record" the right definition of a user?** If you'd rather count waitlist emails, the goal is roughly 8× harder. Choose before Day 1.
- **When does buying open?** If checkout goes live in this window, the PH and HN audiences are the best people to convert. If it doesn't, the waitlist is the only thing you keep from the traffic.
