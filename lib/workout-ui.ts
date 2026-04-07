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
