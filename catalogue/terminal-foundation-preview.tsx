import { useEffect, useState } from "react";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import { catalogueCliCapabilities, CliOutputPreview } from "./cli-preview.tsx";
import type {
  TerminalFoundationAnimation,
  TerminalFoundationSheet,
} from "./terminal-foundations.ts";

function prefersReducedMotion(): boolean {
  return typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function AnimatedTerminalSpecimen(
  { animation, sheetTitle, specimenTitle, theme }: {
    readonly animation: TerminalFoundationAnimation;
    readonly sheetTitle: string;
    readonly specimenTitle: string;
    readonly theme: TerminalThemeVariant;
  },
) {
  const [running, setRunning] = useState(() => !prefersReducedMotion());
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return;
    const preference = globalThis.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const reflectPreference = (event: MediaQueryListEvent): void => {
      setRunning(!event.matches);
    };
    setRunning(!preference.matches);
    preference.addEventListener("change", reflectPreference);
    return () => preference.removeEventListener("change", reflectPreference);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setPhase((current) => (current + 1) % animation.frames.length);
    }, animation.intervalMs);
    return () => clearInterval(timer);
  }, [animation.frames.length, animation.intervalMs, running]);

  const frame = animation.frames[phase % animation.frames.length];
  if (frame === undefined) {
    throw new TypeError(`${animation.label} has no animation frames`);
  }

  return (
    <div
      className="discern-catalogue-terminal-foundation__animation"
      data-discern-terminal-animation={running ? "running" : "paused"}
    >
      <div className="discern-catalogue-terminal-foundation__output-heading">
        <span>{animation.label} · live</span>
        <button type="button" onClick={() => setRunning((current) => !current)}>
          {running ? "Pause animation" : "Play animation"}
        </button>
      </div>
      <div aria-live="off">
        <CliOutputPreview
          value={frame}
          label={`${sheetTitle}: ${specimenTitle} live animation`}
          theme={theme}
        />
      </div>
    </div>
  );
}

/** Render every specimen declared by one terminal foundation registry entry. */
export function TerminalFoundationPreview(
  { sheet, theme }: {
    readonly sheet: TerminalFoundationSheet;
    readonly theme: TerminalThemeVariant;
  },
) {
  const specimens = sheet.specimens(catalogueCliCapabilities, { theme });
  return (
    <section
      className="discern-catalogue-subsection discern-catalogue-terminal-foundation"
      id={`terminal-foundation-${sheet.id}`}
      data-discern-terminal-foundation={sheet.id}
    >
      <div className="discern-catalogue-terminal-foundation__heading">
        <div>
          <h3>{sheet.title}</h3>
          <p>{sheet.description}</p>
        </div>
        <span>{specimens.length} specimens</span>
      </div>
      <div className="discern-catalogue-terminal-foundation__grid">
        {specimens.map((specimen) => (
          <article
            className="discern-catalogue-terminal-foundation__specimen"
            id={`terminal-foundation-${sheet.id}-${specimen.id}`}
            data-discern-terminal-foundation-specimen={specimen.id}
            key={specimen.id}
          >
            <h4>{specimen.title}</h4>
            {specimen.animation === undefined ? null : (
              <AnimatedTerminalSpecimen
                animation={specimen.animation}
                sheetTitle={sheet.title}
                specimenTitle={specimen.title}
                theme={theme}
              />
            )}
            <div className="discern-catalogue-terminal-foundation__static">
              {specimen.animation === undefined
                ? null
                : (
                  <span className="discern-catalogue-terminal-foundation__label">
                    Complete static evidence
                  </span>
                )}
              <CliOutputPreview
                value={specimen.output}
                label={`${sheet.title}: ${specimen.title} output`}
                theme={theme}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
