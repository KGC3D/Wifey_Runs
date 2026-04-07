import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowRunHint } from "../lib/workout-ui.ts";

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
