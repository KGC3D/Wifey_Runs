import assert from "node:assert/strict";
import test from "node:test";

import {
  getIntervalProgress,
  shouldShowRunHint,
} from "../lib/workout-ui.ts";

test("showRunHint is false before the workout starts", () => {
  assert.equal(shouldShowRunHint("idle", "Run"), false);
});

test("showRunHint is true during an active run interval", () => {
  assert.equal(shouldShowRunHint("running", "Run"), true);
  assert.equal(shouldShowRunHint("paused", "Run"), true);
});

test("showRunHint is false for non-run labels and after completion", () => {
  assert.equal(shouldShowRunHint("running", "Warm-up"), false);
  assert.equal(shouldShowRunHint("running", "Walk"), false);
  assert.equal(shouldShowRunHint("running", "Cool down"), false);
  assert.equal(shouldShowRunHint("complete", "Run"), false);
});

test("interval progress appears only during run and walk cycles", () => {
  assert.deepEqual(getIntervalProgress("running", 1), { current: 1, total: 5 });
  assert.deepEqual(getIntervalProgress("running", 2), { current: 1, total: 5 });
  assert.deepEqual(getIntervalProgress("paused", 9), { current: 5, total: 5 });
});

test("interval progress stays hidden outside the interval block", () => {
  assert.equal(getIntervalProgress("idle", 0), null);
  assert.equal(getIntervalProgress("running", 0), null);
  assert.equal(getIntervalProgress("running", 11), null);
  assert.equal(getIntervalProgress("complete", 9), null);
});
