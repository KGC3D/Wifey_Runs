import assert from "node:assert/strict";
import test from "node:test";

import { stepBoundariesMs, totalDurationMs, workout } from "../lib/workout.ts";

test("workout terminates with an explicit completion step", () => {
  assert.equal(workout.at(-1)?.label, "Workout complete");
  assert.equal(workout.at(-1)?.duration, 0);
});

test("step boundaries stay aligned with workout steps", () => {
  assert.equal(stepBoundariesMs.length, workout.length);

  stepBoundariesMs.forEach((boundary, index) => {
    assert.ok(boundary >= 0);

    if (index > 0) {
      assert.ok(boundary >= stepBoundariesMs[index - 1]);
    }
  });
});

test("total duration matches the terminal completion boundary", () => {
  assert.equal(totalDurationMs, 1_440_000);
  assert.equal(stepBoundariesMs.at(-1), totalDurationMs);
  assert.equal(stepBoundariesMs.at(-2), totalDurationMs);
});
