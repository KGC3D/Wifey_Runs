export type WorkoutScreenStatus = "idle" | "running" | "paused" | "complete";

export const countdownTimerA11y = {
  role: "timer",
  ariaLive: "off" as const,
  ariaAtomic: true,
} as const;

export function getCountdownAriaLabel(
  status: WorkoutScreenStatus,
  countdownText: string
): string {
  switch (status) {
    case "idle":
      return `Workout duration ${countdownText}`;
    case "paused":
      return `Paused, ${countdownText} left in this interval`;
    case "complete":
      return "Workout complete";
    case "running":
    default:
      return `${countdownText} left in this interval`;
  }
}
