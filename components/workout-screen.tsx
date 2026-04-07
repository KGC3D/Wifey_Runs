"use client";

// Mobile-first single-screen workout UI. Real implementation lands in PR2
// (Phase 4). This stub renders a placeholder so the file structure is wired
// up end-to-end and the route boots cleanly.

export function WorkoutScreen() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "0.02em" }}>
        Wifey Runs
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: "28ch" }}>
        Workout UI lands in PR2.
      </p>
    </main>
  );
}
