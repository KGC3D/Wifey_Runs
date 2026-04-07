import assert from "node:assert/strict";
import test from "node:test";

import { stepBoundariesMs, totalDurationMs, workout } from "../lib/workout.ts";
import {
  getCurrentStepIndex,
  getElapsedMs,
  getStepProgress,
  isComplete,
  scaleBoundariesMs,
} from "../lib/timer.ts";

test("getElapsedMs returns 0 before the workout has started", () => {
  assert.equal(
    getElapsedMs({
      startedAtMs: null,
      pausedAccumulatedMs: 0,
      pauseStartedAtMs: null,
      nowMs: 1_000_000,
    }),
    0
  );
});

test("getElapsedMs measures wall-clock progress while running", () => {
  assert.equal(
    getElapsedMs({
      startedAtMs: 1_000_000,
      pausedAccumulatedMs: 0,
      pauseStartedAtMs: null,
      nowMs: 1_007_500,
    }),
    7_500
  );
});

test("getElapsedMs subtracts accumulated paused time", () => {
  assert.equal(
    getElapsedMs({
      startedAtMs: 1_000_000,
      pausedAccumulatedMs: 2_000,
      pauseStartedAtMs: null,
      nowMs: 1_010_000,
    }),
    8_000
  );
});

test("getElapsedMs freezes at the moment a pause begins", () => {
  // Started at 1_000_000, paused at 1_005_000. Now ticked forward to
  // 1_010_000. Elapsed should report 5_000, not 10_000, because we are
  // still paused.
  assert.equal(
    getElapsedMs({
      startedAtMs: 1_000_000,
      pausedAccumulatedMs: 0,
      pauseStartedAtMs: 1_005_000,
      nowMs: 1_010_000,
    }),
    5_000
  );
});

test("getElapsedMs clamps to zero if paused before any progress", () => {
  assert.equal(
    getElapsedMs({
      startedAtMs: 1_000_000,
      pausedAccumulatedMs: 0,
      pauseStartedAtMs: 999_000,
      nowMs: 1_005_000,
    }),
    0
  );
});

test("getCurrentStepIndex returns 0 at the very start", () => {
  assert.equal(getCurrentStepIndex(0, stepBoundariesMs), 0);
});

test("getCurrentStepIndex stays in the warm-up just before the first boundary", () => {
  assert.equal(getCurrentStepIndex(299_999, stepBoundariesMs), 0);
});

test("getCurrentStepIndex transitions exactly at the boundary instant", () => {
  // At elapsedMs === 300_000 (end of warm-up), the controller should be on
  // step 1 (first Run interval), not still on step 0.
  assert.equal(getCurrentStepIndex(300_000, stepBoundariesMs), 1);
});

test("getCurrentStepIndex points at the terminal step once the workout finishes", () => {
  assert.equal(
    getCurrentStepIndex(totalDurationMs, stepBoundariesMs),
    workout.length - 1
  );
});

test("getCurrentStepIndex never overruns past the terminal step", () => {
  assert.equal(
    getCurrentStepIndex(totalDurationMs + 60_000, stepBoundariesMs),
    workout.length - 1
  );
});

test("getStepProgress reports a fresh step at its start boundary", () => {
  // 300_000 ms in we just transitioned into step 1 (Run, 180s).
  const progress = getStepProgress(300_000, 1, stepBoundariesMs);
  assert.equal(progress.stepDurationMs, 180_000);
  assert.equal(progress.stepElapsedMs, 0);
  assert.equal(progress.stepRemainingMs, 180_000);
});

test("getStepProgress reports halfway through a step", () => {
  // 90s into the first Run interval -> halfway.
  const progress = getStepProgress(390_000, 1, stepBoundariesMs);
  assert.equal(progress.stepDurationMs, 180_000);
  assert.equal(progress.stepElapsedMs, 90_000);
  assert.equal(progress.stepRemainingMs, 90_000);
});

test("getStepProgress clamps when elapsed exceeds the step boundary", () => {
  // If for any reason elapsed has slipped past the current step boundary,
  // the values should clamp rather than go negative.
  const progress = getStepProgress(500_000, 1, stepBoundariesMs);
  assert.equal(progress.stepRemainingMs, 0);
  assert.equal(progress.stepElapsedMs, progress.stepDurationMs);
});

test("isComplete is false partway through the cool down", () => {
  assert.equal(isComplete(totalDurationMs - 1, stepBoundariesMs), false);
});

test("isComplete is true at the exact terminal boundary", () => {
  assert.equal(isComplete(totalDurationMs, stepBoundariesMs), true);
});

test("scaleBoundariesMs preserves the boundary count", () => {
  assert.equal(scaleBoundariesMs(stepBoundariesMs, 10).length, stepBoundariesMs.length);
});

test("scaleBoundariesMs divides each boundary by the speed multiplier", () => {
  const scaled = scaleBoundariesMs(stepBoundariesMs, 10);
  assert.equal(scaled[0], 30_000); // warm-up: 300_000 / 10
  assert.equal(scaled.at(-1), Math.round(totalDurationMs / 10));
});

test("scaleBoundariesMs ignores invalid multipliers and returns the original spacing", () => {
  assert.deepEqual(scaleBoundariesMs(stepBoundariesMs, 0), [...stepBoundariesMs]);
  assert.deepEqual(scaleBoundariesMs(stepBoundariesMs, -1), [...stepBoundariesMs]);
  assert.deepEqual(
    scaleBoundariesMs(stepBoundariesMs, Number.NaN),
    [...stepBoundariesMs]
  );
});
