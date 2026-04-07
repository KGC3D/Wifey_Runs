"use client";

import dynamic from "next/dynamic";

// Render WorkoutScreen client-only. Skipping SSR lets the controller hook
// safely read `window.location.search` for the dev `?fast=N` flag without
// causing a hydration mismatch, and avoids the React 19 cascading-render
// lint when reading the URL.
const WorkoutScreen = dynamic(
  () =>
    import("@/components/workout-screen").then((m) => ({
      default: m.WorkoutScreen,
    })),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

function LoadingScreen() {
  return (
    <main
      style={{
        minHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
        Loading…
      </span>
    </main>
  );
}

export default function Home() {
  return <WorkoutScreen />;
}
