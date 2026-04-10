// Canonical workout definition. Hardcoded by design — no runtime editing UI.

export type WorkoutStep = {
  label: string;
  /** Duration in seconds. The terminal step uses 0 to mark completion. */
  duration: number;
};

export const workout: ReadonlyArray<WorkoutStep> = [
  { label: "Warm-up", duration: 300 },
  { label: "Run", duration: 120 },
  { label: "Walk", duration: 90 },
  { label: "Run", duration: 120 },
  { label: "Walk", duration: 90 },
  { label: "Run", duration: 120 },
  { label: "Walk", duration: 90 },
  { label: "Run", duration: 120 },
  { label: "Walk", duration: 90 },
  { label: "Run", duration: 120 },
  { label: "Walk", duration: 90 },
  { label: "Cool down", duration: 300 },
  { label: "Workout complete", duration: 0 },
];

export const totalIntervals = workout.filter((step) => step.label === "Run").length;

/**
 * Interval number aligned to each workout step.
 * Warm-up is 0, each Run increments the count, and the following Walk keeps
 * the same count so a run/walk cycle shares one interval number.
 */
export const intervalNumberByStep: ReadonlyArray<number> = workout.reduce<number[]>(
  (acc, step) => {
    const prev = acc.length === 0 ? 0 : acc[acc.length - 1];
    acc.push(step.label === "Run" ? prev + 1 : prev);
    return acc;
  },
  []
);

/**
 * Cumulative end-of-step boundaries in milliseconds, indexed by step.
 * boundaries[i] is the elapsed-ms value at which step i ends.
 * The terminal zero-duration "Workout complete" step shares the same boundary
 * as the previous step, which is how the controller detects completion.
 */
export const stepBoundariesMs: ReadonlyArray<number> = workout.reduce<number[]>(
  (acc, step) => {
    const prev = acc.length === 0 ? 0 : acc[acc.length - 1];
    acc.push(prev + step.duration * 1000);
    return acc;
  },
  []
);

export const totalDurationMs =
  stepBoundariesMs[stepBoundariesMs.length - 1] ?? 0;
