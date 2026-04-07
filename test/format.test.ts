import assert from "node:assert/strict";
import test from "node:test";

import { formatMmSs } from "../lib/format.ts";

test("formatMmSs clamps invalid values to zero", () => {
  assert.equal(formatMmSs(-1), "0:00");
  assert.equal(formatMmSs(Number.NaN), "0:00");
  assert.equal(formatMmSs(Number.POSITIVE_INFINITY), "0:00");
});

test("formatMmSs rounds partial seconds up for countdown display", () => {
  assert.equal(formatMmSs(1), "0:01");
  assert.equal(formatMmSs(59_001), "1:00");
});

test("formatMmSs zero-pads seconds once minutes are present", () => {
  assert.equal(formatMmSs(61_000), "1:01");
  assert.equal(formatMmSs(10 * 60_000), "10:00");
});
