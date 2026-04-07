import assert from "node:assert/strict";
import test from "node:test";

import {
  countdownTimerA11y,
  getCountdownAriaLabel,
} from "../lib/workout-a11y.ts";

test("countdown timer is exposed as a non-live timer region", () => {
  assert.equal(countdownTimerA11y.role, "timer");
  assert.equal(countdownTimerA11y.ariaLive, "off");
  assert.equal(countdownTimerA11y.ariaAtomic, true);
});

test("countdown label describes the current timer state without a live region", () => {
  assert.equal(getCountdownAriaLabel("idle", "26:00"), "Workout duration 26:00");
  assert.equal(
    getCountdownAriaLabel("paused", "0:45"),
    "Paused, 0:45 left in this interval"
  );
  assert.equal(getCountdownAriaLabel("running", "2:59"), "2:59 left in this interval");
  assert.equal(getCountdownAriaLabel("complete", "0:00"), "Workout complete");
});
