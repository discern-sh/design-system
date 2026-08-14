import { Ground } from "./ground.tsx";

export default function GroundExamples() {
  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "24rem",
        overflow: "hidden",
        border: "1px solid var(--discern-color-border)",
        background: "var(--discern-color-canvas)",
      }}
    >
      <Ground>
        <svg
          className="discern-ground__plate"
          viewBox="0 0 1200 600"
          focusable="false"
        >
          <circle
            cx="920"
            cy="180"
            r="260"
            fill="none"
            stroke="var(--discern-ground-guide)"
            strokeWidth="1"
            opacity="var(--discern-ground-veil-3)"
          />
          <path
            d="M 0 560 L 540 40 L 1200 420"
            fill="none"
            stroke="var(--discern-ground-accent)"
            strokeWidth="1.25"
            opacity="var(--discern-ground-veil-4)"
          />
        </svg>
      </Ground>
      <div style={{ position: "relative", zIndex: 1, padding: "4rem" }}>
        <h2>A quiet plane for authored work.</h2>
        <p style={{ maxWidth: "34rem" }}>
          Foreground meaning remains complete while the ground supplies only
          atmosphere.
        </p>
      </div>
    </section>
  );
}
