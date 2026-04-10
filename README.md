# Wifey Runs

A dead-simple iPhone-friendly run/walk interval timer with spoken workout cues.
No accounts. No backend. No editing UI. Tap **Start**, put your phone in your
pocket, and listen.

## What it does

Plays a fixed 27-minute 30-second Couch-to-5K-style interval workout and speaks each
phase aloud through your phone or AirPods using the browser's
[Web Speech API](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis).

The workout:

| #   | Phase            | Duration |
| --- | ---------------- | -------- |
| 1   | Warm-up          | 5:00     |
| 2   | Run              | 2:00     |
| 3   | Walk             | 1:30     |
| 4   | Run              | 2:00     |
| 5   | Walk             | 1:30     |
| 6   | Run              | 2:00     |
| 7   | Walk             | 1:30     |
| 8   | Run              | 2:00     |
| 9   | Walk             | 1:30     |
| 10  | Run              | 2:00     |
| 11  | Walk             | 1:30     |
| 12  | Cool down        | 5:00     |
| 13  | Workout complete | —        |

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Deploy

The easiest path is Vercel:

```bash
npx vercel
```

Or push to a GitHub repo connected to Vercel and it will auto-deploy on each
push to `main`.

## Install on iPhone

Once deployed, the app can be installed as a standalone home-screen web app:

1. Open the deployed URL in **Safari** on your iPhone (not Chrome — iOS install
   only works through Safari).
2. Tap the **Share** button (square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right.
5. Launch from the home screen — it runs full-screen with no Safari chrome.

## Caveats

- iOS Safari background and lock-screen audio behavior is best-effort. The Web
  Speech API does not have the same guarantees as native audio APIs. For the
  most reliable hands-free experience, keep the screen awake while the workout
  runs (or use AirPods / Bluetooth headphones, which generally hold the audio
  session better).
- Timing is derived from real timestamps via `Date.now()`, so the workout
  recovers correctly from JS throttling or brief backgrounding — but if iOS
  fully suspends the tab, queued speech may not play until you return to it.
- This is not a fitness tracker. There is no GPS, no heart rate, no history,
  and no account.

## Tech

- Next.js 16 (App Router) + React 19 + TypeScript
- Web Speech API (`speechSynthesis`) — no third-party TTS
- Plain CSS, mobile-first, with iOS safe-area insets
- No backend, no database, no analytics

## License

MIT.
