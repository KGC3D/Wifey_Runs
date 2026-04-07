"use client";

import { useWorkoutController } from "@/hooks/use-workout-controller";
import { formatMmSs } from "@/lib/format";
import {
  countdownTimerA11y,
  getCountdownAriaLabel,
} from "@/lib/workout-a11y";

// Mobile-first single-screen workout UI. Intentionally minimal: no settings,
// no editing, no profile, no analytics. The interface should never grow.

export function WorkoutScreen() {
  const ctrl = useWorkoutController();
  const isRunning = ctrl.status === "running";
  const isPaused = ctrl.status === "paused";
  const isComplete = ctrl.status === "complete";
  const isIdle = ctrl.status === "idle";

  const primaryLabel = isPaused ? "Resume" : isRunning ? "Pause" : "Start";
  const onPrimary = isPaused
    ? ctrl.resume
    : isRunning
      ? ctrl.pause
      : ctrl.start;

  // Hide the "Next" line during the terminal step or before the workout starts
  // to keep the screen quiet.
  const showNext =
    !isIdle && !isComplete && ctrl.nextStepLabel !== null;

  // Speed badge: only shown when the dev fast flag is active. Tiny and unobtrusive
  // — present so the QA tester knows the URL flag is in effect.
  const showSpeedBadge = ctrl.speedMultiplier !== 1;
  const countdownText = formatMmSs(
    isIdle ? ctrl.totalDurationMs : isComplete ? 0 : ctrl.stepRemainingMs
  );

  return (
    <main
      style={{
        minHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom))",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1.25rem",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.75rem",
          paddingTop: "0.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Wifey Runs
        </h1>
        {showSpeedBadge && (
          <span
            aria-label={`Fast mode ${ctrl.speedMultiplier} times`}
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              padding: "0.125rem 0.5rem",
              borderRadius: "999px",
              background: "var(--accent)",
              color: "#0a0a0a",
              textTransform: "uppercase",
            }}
          >
            Fast {ctrl.speedMultiplier}x
          </span>
        )}
      </header>

      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          textAlign: "center",
        }}
      >
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontSize: "clamp(2rem, 9vw, 2.75rem)",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: isComplete ? "var(--muted)" : "var(--fg)",
          }}
        >
          {isIdle ? "Ready" : ctrl.currentStepLabel}
        </div>

        <div
          role={countdownTimerA11y.role}
          aria-live={countdownTimerA11y.ariaLive}
          aria-atomic={countdownTimerA11y.ariaAtomic}
          aria-label={getCountdownAriaLabel(ctrl.status, countdownText)}
          style={{
            fontSize: "clamp(4.5rem, 22vw, 7.5rem)",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            color: "var(--fg)",
          }}
        >
          {countdownText}
        </div>

        {showNext && (
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--muted)",
              letterSpacing: "0.02em",
            }}
          >
            Next: {ctrl.nextStepLabel}
          </div>
        )}

        {!isIdle && !isComplete && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--muted)",
              letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Total left {formatMmSs(ctrl.totalRemainingMs)}
          </div>
        )}
      </section>

      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          paddingBottom: "0.5rem",
        }}
      >
        {isComplete ? (
          <button
            type="button"
            onClick={ctrl.reset}
            style={primaryButtonStyle}
          >
            Start over
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onPrimary}
              style={primaryButtonStyle}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={ctrl.reset}
              disabled={isIdle}
              style={{
                ...secondaryButtonStyle,
                opacity: isIdle ? 0.4 : 1,
              }}
            >
              Reset
            </button>
          </>
        )}
      </footer>
    </main>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "1.125rem 1rem",
  fontSize: "1.125rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  background: "var(--accent)",
  color: "#0a0a0a",
  borderRadius: "999px",
  // Big tap target on iPhone
  minHeight: "3.75rem",
  // Avoid iOS double-tap zoom on buttons
  touchAction: "manipulation",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  fontSize: "0.9375rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid #2a2a2a",
  borderRadius: "999px",
  minHeight: "3rem",
  touchAction: "manipulation",
};
