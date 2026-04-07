"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import {
  stepBoundariesMs as canonicalBoundariesMs,
  workout,
} from "@/lib/workout";
import {
  getCurrentStepIndex,
  getElapsedMs,
  getPendingStepIndexes,
  getStepProgress,
  isComplete,
  scaleBoundariesMs,
} from "@/lib/timer";
import {
  cancelSpeech,
  enqueueSpeech,
  prepareSpeech,
  speak,
} from "@/lib/speech";

/**
 * Read the dev `?fast=N` URL flag. Safe to call during render — returns 1
 * on the server (no window) and the URL-derived value on the client. Pure
 * function so it can run inside a useState lazy initializer without
 * triggering cascading renders or hydration mismatches.
 *
 * Hydration safety: this hook is only mounted from a `next/dynamic` import
 * with `ssr: false` (see app/page.tsx), so the lazy initializer only ever
 * runs on the client. The `typeof window` guard is belt-and-suspenders.
 */
function readSpeedMultiplierFromUrl(): number {
  if (typeof window === "undefined") return 1;
  const raw = new URLSearchParams(window.location.search).get("fast");
  if (raw === null) return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export type WorkoutStatus = "idle" | "running" | "paused" | "complete";

type State = {
  status: WorkoutStatus;
  startedAtMs: number | null;
  pauseStartedAtMs: number | null;
  pausedAccumulatedMs: number;
  nowMs: number;
  lastSpokenStepIndex: number | null;
};

type Action =
  | { type: "START"; nowMs: number }
  | { type: "PAUSE"; nowMs: number }
  | { type: "RESUME"; nowMs: number }
  | { type: "RESET" }
  | { type: "TICK"; nowMs: number }
  | { type: "MARK_SPOKEN"; index: number }
  | { type: "COMPLETE" };

const initialState: State = {
  status: "idle",
  startedAtMs: null,
  pauseStartedAtMs: null,
  pausedAccumulatedMs: 0,
  nowMs: 0,
  lastSpokenStepIndex: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return {
        status: "running",
        startedAtMs: action.nowMs,
        pauseStartedAtMs: null,
        pausedAccumulatedMs: 0,
        nowMs: action.nowMs,
        // Mark step 0 as already spoken — start() handles the first
        // utterance synchronously inside the click handler so the speech
        // effect should not double-speak it.
        lastSpokenStepIndex: 0,
      };
    case "PAUSE":
      if (state.status !== "running") return state;
      return {
        ...state,
        status: "paused",
        pauseStartedAtMs: action.nowMs,
        nowMs: action.nowMs,
      };
    case "RESUME":
      if (state.status !== "paused" || state.pauseStartedAtMs === null) {
        return state;
      }
      return {
        ...state,
        status: "running",
        pauseStartedAtMs: null,
        pausedAccumulatedMs:
          state.pausedAccumulatedMs +
          (action.nowMs - state.pauseStartedAtMs),
        nowMs: action.nowMs,
      };
    case "RESET":
      return initialState;
    case "TICK":
      if (state.status !== "running") return state;
      return { ...state, nowMs: action.nowMs };
    case "MARK_SPOKEN":
      return { ...state, lastSpokenStepIndex: action.index };
    case "COMPLETE":
      return { ...state, status: "complete" };
    default:
      return state;
  }
}

/**
 * The workout controller. Owns all timer state, derives display values from
 * raw timestamps via lib/timer, and dispatches speech via lib/speech.
 *
 * Reads the dev `?fast=N` URL flag once on mount to scale workout boundaries
 * for QA — invisible to users, no UI surface.
 */
export function useWorkoutController() {
  // Lazy initializer runs once on first client render. WorkoutScreen is
  // mounted via next/dynamic with ssr:false so this never runs on the
  // server, eliminating any hydration mismatch.
  const [speedMultiplier] = useState(readSpeedMultiplierFromUrl);

  const boundariesMs = useMemo(
    () => scaleBoundariesMs(canonicalBoundariesMs, speedMultiplier),
    [speedMultiplier]
  );
  const scaledTotalDurationMs = boundariesMs[boundariesMs.length - 1] ?? 0;

  const [state, dispatch] = useReducer(reducer, initialState);

  // Pre-load voices so the cache is warm by the time the user taps Start.
  useEffect(() => {
    prepareSpeech();
  }, []);

  // Tick interval — refresh nowMs every 250ms while running. Driven by real
  // Date.now() so timing recovers from JS throttling and brief backgrounding.
  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => {
      dispatch({ type: "TICK", nowMs: Date.now() });
    }, 250);
    return () => window.clearInterval(id);
  }, [state.status]);

  // Derive everything from raw state.
  const elapsedMs = getElapsedMs(state);
  const currentStepIndex = getCurrentStepIndex(elapsedMs, boundariesMs);
  const stepProgress = getStepProgress(
    elapsedMs,
    currentStepIndex,
    boundariesMs
  );
  const totalRemainingMs =
    scaledTotalDurationMs - elapsedMs > 0
      ? scaledTotalDurationMs - elapsedMs
      : 0;
  const completed = isComplete(elapsedMs, boundariesMs);

  // Speak on step transitions while running. Note: we never speak inside
  // this effect for the very first step — start() handles that synchronously
  // inside the user-tap to satisfy iOS Safari's gesture requirement.
  useEffect(() => {
    if (state.status !== "running") return;
    const pendingStepIndexes = getPendingStepIndexes(
      state.lastSpokenStepIndex,
      currentStepIndex
    );
    if (pendingStepIndexes.length === 0) return;

    const labels = pendingStepIndexes
      .map((index) => workout[index]?.label ?? "")
      .filter(Boolean);

    if (labels.length > 0) {
      enqueueSpeech(labels);
    }

    dispatch({
      type: "MARK_SPOKEN",
      index: pendingStepIndexes[pendingStepIndexes.length - 1],
    });
  }, [state.status, state.lastSpokenStepIndex, currentStepIndex]);

  // Detect completion exactly once per workout and transition to 'complete'.
  useEffect(() => {
    if (state.status !== "running") return;
    if (!completed) return;
    dispatch({ type: "COMPLETE" });
  }, [state.status, completed]);

  // Action creators. start() must speak synchronously inside the click
  // handler so iOS Safari unlocks the audio session.
  const start = useCallback(() => {
    const firstLabel = workout[0]?.label ?? "";
    if (firstLabel) speak(firstLabel);
    dispatch({ type: "START", nowMs: Date.now() });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: "PAUSE", nowMs: Date.now() });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: "RESUME", nowMs: Date.now() });
  }, []);

  const reset = useCallback(() => {
    cancelSpeech();
    dispatch({ type: "RESET" });
  }, []);

  return {
    status: state.status,
    currentStepIndex,
    currentStepLabel: workout[currentStepIndex]?.label ?? "",
    nextStepLabel:
      currentStepIndex + 1 < workout.length - 1
        ? workout[currentStepIndex + 1].label
        : null,
    stepDurationMs: stepProgress.stepDurationMs,
    stepElapsedMs: stepProgress.stepElapsedMs,
    stepRemainingMs: stepProgress.stepRemainingMs,
    totalElapsedMs: elapsedMs,
    totalRemainingMs,
    totalDurationMs: scaledTotalDurationMs,
    speedMultiplier,
    start,
    pause,
    resume,
    reset,
  };
}
