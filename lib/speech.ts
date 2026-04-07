// Web Speech API wrapper. Client-only — must not be imported in a server
// component. Designed around two iOS Safari constraints:
//
//   1) The very first `speak()` call MUST run synchronously inside the
//      user-tap handler that started the workout, otherwise iOS locks the
//      audio session and no further utterances will play. We achieve this
//      by pre-loading voices via `prepareSpeech()` on component mount, then
//      keeping `speak()` synchronous so it does not await anything inside
//      the click handler.
//
//   2) `getVoices()` may return an empty list initially. Voices arrive
//      asynchronously and fire a `voiceschanged` event. We listen once and
//      time out after 1.5s as a safety net.
//
// Web Speech does not expose a standard `gender` field, so the female-voice
// preference is a best-effort heuristic over the voice `name` string.

const FEMALE_VOICE_NAME_PATTERN =
  /samantha|victoria|karen|ava|allison|susan|moira|zira|female|fiona|tessa|veena|catherine|kate|serena|nicky|joelle/i;

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** True if the current environment supports the Web Speech API. */
export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Resolve a list of voices, handling the asynchronous-load quirk where
 * `getVoices()` returns an empty array on first call. Returns whatever
 * voices are available within 1.5s.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechAvailable()) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const initial = synth.getVoices();
    if (initial.length > 0) {
      resolve(initial);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", handler);
      resolve(synth.getVoices());
    };
    const handler = () => finish();
    synth.addEventListener("voiceschanged", handler);
    // Safety net for browsers that never fire voiceschanged.
    setTimeout(finish, 1500);
  });
}

/**
 * Choose a voice with a best-effort female-sounding heuristic.
 * Pure function — exported for unit testing.
 *
 * Selection order:
 *   1) Voice whose name matches the female-name pattern, in the preferred lang
 *   2) Voice flagged as `default`, in the preferred lang
 *   3) First voice in the preferred lang
 *   4) Female-name match in any language
 *   5) First voice in any language
 *   6) null (no voices at all)
 */
export function pickVoice(
  voices: ReadonlyArray<SpeechSynthesisVoice>,
  preferredLang = "en"
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const lang = preferredLang.toLowerCase();
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));

  if (inLang.length > 0) {
    const female = inLang.find((v) => FEMALE_VOICE_NAME_PATTERN.test(v.name));
    if (female) return female;
    const def = inLang.find((v) => v.default);
    if (def) return def;
    return inLang[0];
  }

  const femaleAny = voices.find((v) => FEMALE_VOICE_NAME_PATTERN.test(v.name));
  if (femaleAny) return femaleAny;
  return voices[0] ?? null;
}

/**
 * Kick off voice loading and cache the chosen voice. Call once when the
 * workout screen mounts so the cache is warm by the time the user taps
 * Start. Idempotent — safe to call multiple times.
 */
export function prepareSpeech(): void {
  if (!isSpeechAvailable()) return;
  if (voicesPromise) return;
  voicesPromise = loadVoices().then((voices) => {
    cachedVoice = pickVoice(voices, "en");
    return voices;
  });
}

function createUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  if (cachedVoice) {
    utterance.voice = cachedVoice;
    utterance.lang = cachedVoice.lang;
  } else {
    utterance.lang = "en-US";
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  return utterance;
}

/**
 * Append one or more utterances to the native speech queue without
 * interrupting audio that is already in flight.
 */
export function enqueueSpeech(texts: ReadonlyArray<string>): void {
  if (!isSpeechAvailable()) return;
  const synth = window.speechSynthesis;

  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    try {
      synth.speak(createUtterance(trimmed));
    } catch {
      // Some browsers throw if the audio session is locked — stop trying.
      break;
    }
  }
}

/**
 * Speak `text` immediately, cancelling any in-flight or queued utterances
 * first so stale step transitions never pile up. Synchronous by design so
 * it preserves the user-gesture chain on iOS Safari. No-op if the Web
 * Speech API is unavailable.
 */
export function speak(text: string): void {
  if (!isSpeechAvailable()) return;
  cancelSpeech();
  enqueueSpeech([text]);
}

/** Cancel any queued or in-flight speech. Safe to call when nothing is queued. */
export function cancelSpeech(): void {
  if (!isSpeechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

/** Test-only helper. Resets the module-level voice cache between tests. */
export function __resetSpeechForTests(): void {
  cachedVoice = null;
  voicesPromise = null;
}
