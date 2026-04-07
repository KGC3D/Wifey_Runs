// Pure timer math. No React, no DOM, no globals — every value is derived
// from the raw timestamps stored in the controller.
//
// The controller stores:
//   - startedAtMs:        Date.now() when Start was first tapped
//   - pausedAccumulatedMs: total ms spent paused across previous pauses
//   - pauseStartedAtMs:   Date.now() when the current pause started, or null
//   - nowMs:              Date.now() refreshed by a 250ms interval while running
//
// All elapsed/step/remaining values are derived from those four numbers, so
// JS interval drift, throttling, or brief backgrounding cannot corrupt the
// workout timing. Worst case is a one-frame visual stale update.

export type ElapsedInputs = {
  startedAtMs: number | null;
  pausedAccumulatedMs: number;
  pauseStartedAtMs: number | null;
  nowMs: number;
};

/**
 * Total elapsed workout time in milliseconds.
 * Returns 0 before the workout has started.
 * While paused, freezes at the instant the current pause began.
 */
export function getElapsedMs(inputs: ElapsedInputs): number {
  if (inputs.startedAtMs === null) return 0;
  const referenceMs = inputs.pauseStartedAtMs ?? inputs.nowMs;
  const elapsed = referenceMs - inputs.startedAtMs - inputs.pausedAccumulatedMs;
  return elapsed > 0 ? elapsed : 0;
}

/**
 * Index of the workout step currently in progress for the given elapsed time.
 * Returns the index of the first step whose end-boundary is strictly greater
 * than `elapsedMs`. Once `elapsedMs` reaches or exceeds the final boundary,
 * returns the index of the terminal step.
 */
export function getCurrentStepIndex(
  elapsedMs: number,
  boundariesMs: ReadonlyArray<number>
): number {
  if (boundariesMs.length === 0) return 0;
  for (let i = 0; i < boundariesMs.length; i++) {
    if (elapsedMs < boundariesMs[i]) {
      return i;
    }
  }
  return boundariesMs.length - 1;
}

/**
 * Step indexes that became newly active since the last spoken cue.
 * Used to backfill every missed boundary when elapsed time jumps forward
 * across multiple workout steps between renders.
 */
export function getPendingStepIndexes(
  lastSpokenStepIndex: number | null,
  currentStepIndex: number
): number[] {
  const firstPendingIndex =
    lastSpokenStepIndex === null ? 0 : lastSpokenStepIndex + 1;

  if (currentStepIndex < firstPendingIndex) {
    return [];
  }

  const pending: number[] = [];
  for (let i = Math.max(0, firstPendingIndex); i <= currentStepIndex; i++) {
    pending.push(i);
  }
  return pending;
}

export type StepProgress = {
  stepDurationMs: number;
  stepElapsedMs: number;
  stepRemainingMs: number;
};

/**
 * Progress within the currently active step.
 * stepDurationMs is the configured duration of the active step.
 * stepElapsedMs and stepRemainingMs are clamped to [0, stepDurationMs].
 */
export function getStepProgress(
  elapsedMs: number,
  currentStepIndex: number,
  boundariesMs: ReadonlyArray<number>
): StepProgress {
  if (boundariesMs.length === 0) {
    return { stepDurationMs: 0, stepElapsedMs: 0, stepRemainingMs: 0 };
  }
  const safeIndex = Math.min(
    Math.max(0, currentStepIndex),
    boundariesMs.length - 1
  );
  const prevBoundary = safeIndex === 0 ? 0 : boundariesMs[safeIndex - 1];
  const currBoundary = boundariesMs[safeIndex];
  const stepDurationMs = currBoundary - prevBoundary;
  const rawElapsed = elapsedMs - prevBoundary;
  const stepElapsedMs =
    rawElapsed < 0 ? 0 : rawElapsed > stepDurationMs ? stepDurationMs : rawElapsed;
  const stepRemainingMs = stepDurationMs - stepElapsedMs;
  return { stepDurationMs, stepElapsedMs, stepRemainingMs };
}

/** True once `elapsedMs` has reached the final boundary. */
export function isComplete(
  elapsedMs: number,
  boundariesMs: ReadonlyArray<number>
): boolean {
  if (boundariesMs.length === 0) return false;
  const last = boundariesMs[boundariesMs.length - 1];
  return elapsedMs >= last;
}

/**
 * Scale workout boundaries by a positive multiplier (>1 speeds up the
 * workout proportionally). Used by the dev `?fast=N` URL flag for QA.
 * Returns a fresh array — never mutates the input.
 */
export function scaleBoundariesMs(
  boundariesMs: ReadonlyArray<number>,
  speedMultiplier: number
): number[] {
  const safeMultiplier =
    Number.isFinite(speedMultiplier) && speedMultiplier > 0
      ? speedMultiplier
      : 1;
  return boundariesMs.map((b) => Math.round(b / safeMultiplier));
}
