import { TilingBackdrop } from "./tiling-backdrop.tsx";

export default function TilingBackdropExamples() {
  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "32rem",
        overflow: "hidden",
        border: "1px solid var(--discern-color-border)",
        background: "var(--discern-color-canvas)",
      }}
    >
      <TilingBackdrop />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          alignContent: "center",
          minHeight: "32rem",
          padding: "clamp(2rem, 8vw, 6rem)",
        }}
      >
        <p
          style={{
            marginBlockEnd: "var(--discern-space-3)",
            color: "var(--discern-color-accent-700)",
            fontFamily: "var(--discern-font-ui)",
            fontSize: "var(--discern-font-size-xs)",
            fontWeight: "var(--discern-font-weight-strong)",
          }}
        >
          Tiling
        </p>
        <h2 style={{ maxWidth: "13ch", margin: 0 }}>
          Change the route, keep every connection.
        </h2>
        <p
          style={{ maxWidth: "36rem", color: "var(--discern-color-ink-muted)" }}
        >
          A continuous field turns in isolated places while one quiet path
          traces the result.
        </p>
      </div>
    </section>
  );
}
