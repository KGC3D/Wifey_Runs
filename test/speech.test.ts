import assert from "node:assert/strict";
import test from "node:test";

import {
  __resetSpeechForTests,
  cancelSpeech,
  enqueueSpeech,
  pickVoice,
  speak,
} from "../lib/speech.ts";

// Minimal stand-in for SpeechSynthesisVoice. The DOM type isn't available in
// the Node test environment, so we cast through unknown. pickVoice only reads
// `name`, `lang`, and `default`.
function v(name: string, lang: string, isDefault = false): SpeechSynthesisVoice {
  return { name, lang, default: isDefault } as unknown as SpeechSynthesisVoice;
}

type MockSpeechEnv = {
  cancelCalls: number;
  history: string[];
  queue: string[];
};

function installMockSpeech(): MockSpeechEnv {
  const env: MockSpeechEnv = {
    cancelCalls: 0,
    history: [],
    queue: [],
  };

  class MockSpeechSynthesisUtterance {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = "";
    rate = 1;
    pitch = 1;
    volume = 1;

    constructor(text: string) {
      this.text = text;
    }
  }

  const speechSynthesis = {
    speak(utterance: SpeechSynthesisUtterance) {
      const text = (utterance as unknown as { text: string }).text;
      env.history.push(text);
      env.queue.push(text);
    },
    cancel() {
      env.cancelCalls += 1;
      env.queue = [];
    },
    getVoices() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  } as unknown as SpeechSynthesis;

  Object.assign(globalThis, {
    SpeechSynthesisUtterance:
      MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
    window: { speechSynthesis } as Window & typeof globalThis,
  });

  return env;
}

function uninstallMockSpeech() {
  __resetSpeechForTests();
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
}

test("pickVoice returns null for an empty voice list", () => {
  assert.equal(pickVoice([]), null);
});

test("pickVoice prefers a female-name match in the requested language", () => {
  const voices = [
    v("Alex", "en-US", true),
    v("Daniel", "en-GB"),
    v("Samantha", "en-US"),
    v("Anna", "de-DE"),
  ];
  assert.equal(pickVoice(voices, "en")?.name, "Samantha");
});

test("pickVoice falls back to the default English voice when no female name matches", () => {
  const voices = [
    v("Alex", "en-US", true),
    v("Daniel", "en-GB"),
    v("Anna", "de-DE"),
  ];
  assert.equal(pickVoice(voices, "en")?.name, "Alex");
});

test("pickVoice falls back to the first English voice when no default is flagged", () => {
  const voices = [
    v("Daniel", "en-GB"),
    v("Fred", "en-US"),
    v("Anna", "de-DE"),
  ];
  assert.equal(pickVoice(voices, "en")?.name, "Daniel");
});

test("pickVoice ignores female-name matches in other languages when an English voice exists", () => {
  // Even though "Karen" matches the female heuristic, she's not in English,
  // so an English voice (even a male-named one) should win.
  const voices = [
    v("Karen", "fr-FR"),
    v("Daniel", "en-GB", true),
  ];
  assert.equal(pickVoice(voices, "en")?.name, "Daniel");
});

test("pickVoice falls back to a female voice in another language if no English voice exists", () => {
  const voices = [
    v("Hans", "de-DE"),
    v("Tessa", "en-ZA-extended-x"), // mismatched lang format on purpose
  ];
  // Neither matches "en" prefix exactly, so falls through to the female-any branch.
  // Tessa matches the heuristic.
  assert.equal(pickVoice(voices, "fr")?.name, "Tessa");
});

test("pickVoice returns the first voice when no language and no female match exist", () => {
  const voices = [v("Hans", "de-DE"), v("Klaus", "de-AT")];
  assert.equal(pickVoice(voices, "fr")?.name, "Hans");
});

test("pickVoice handles mixed-case lang prefixes", () => {
  const voices = [v("Samantha", "EN-US"), v("Hans", "DE-DE")];
  assert.equal(pickVoice(voices, "en")?.name, "Samantha");
});

test("enqueueSpeech appends utterances without interrupting queued cues", () => {
  const env = installMockSpeech();

  enqueueSpeech(["Warm-up", "Run", "Walk"]);

  assert.equal(env.cancelCalls, 0);
  assert.deepEqual(env.queue, ["Warm-up", "Run", "Walk"]);
  assert.deepEqual(env.history, ["Warm-up", "Run", "Walk"]);

  uninstallMockSpeech();
});

test("speak cancels queued speech before starting a fresh cue", () => {
  const env = installMockSpeech();

  enqueueSpeech(["Warm-up", "Run"]);
  speak("Walk");

  assert.equal(env.cancelCalls, 1);
  assert.deepEqual(env.queue, ["Walk"]);
  assert.deepEqual(env.history, ["Warm-up", "Run", "Walk"]);

  uninstallMockSpeech();
});

test("cancelSpeech clears the native queue", () => {
  const env = installMockSpeech();

  enqueueSpeech(["Warm-up", "Run"]);
  cancelSpeech();

  assert.equal(env.cancelCalls, 1);
  assert.deepEqual(env.queue, []);

  uninstallMockSpeech();
});
