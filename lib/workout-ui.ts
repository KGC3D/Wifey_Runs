import {
  intervalNumberByStep,
  totalIntervals,
  workout,
} from "./workout.ts";

export type WorkoutUiStatus = "idle" | "running" | "paused" | "complete";

/**
 * Show the coaching hint only while the workout is inside a Run interval.
 * Idle and complete states never surface the hint, even if the last label
 * happened to be "Run".
 */
export function shouldShowRunHint(
  status: WorkoutUiStatus,
  currentStepLabel: string
): boolean {
  return status !== "idle" && status !== "complete" && currentStepLabel === "Run";
}

export type IntervalProgress = {
  current: number;
  total: number;
};

/**
 * Show interval progress only during the repeating run/walk section.
 * Warm-up, cool down, and the terminal completion state stay quiet.
 */
export function getIntervalProgress(
  status: WorkoutUiStatus,
  currentStepIndex: number
): IntervalProgress | null {
  if (status === "idle" || status === "complete") return null;

  const currentLabel = workout[currentStepIndex]?.label;
  if (currentLabel !== "Run" && currentLabel !== "Walk") return null;

  const current = intervalNumberByStep[currentStepIndex] ?? 0;
  if (current <= 0 || totalIntervals <= 0) return null;

  return { current, total: totalIntervals };
}
