import { useEffect, useState } from "react";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import { catalogueCliCapabilities, CliOutputPreview } from "./cli-preview.tsx";
import type {
  TerminalFoundationAnimation,
  TerminalFoundationSheet,
  TerminalFoundationSpecimen,
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
        <span>{animation.label} · Live preview</span>
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

function groupedSpecimens(specimens: readonly TerminalFoundationSpecimen[]) {
  const groups = new Map<string, TerminalFoundationSpecimen[]>();
  for (const specimen of specimens) {
    const group = specimen.group ?? "Specimens";
    const members = groups.get(group) ?? [];
    members.push(specimen);
    groups.set(group, members);
  }
  return [...groups.entries()];
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
    <div
      className="discern-catalogue-terminal-foundation"
      id={`terminal-foundation-${sheet.id}`}
      data-discern-terminal-foundation={sheet.id}
    >
      {groupedSpecimens(specimens).map(([group, members]) => (
        <section
          className="discern-catalogue-terminal-foundation__group"
          key={group}
        >
          <div className="discern-catalogue-terminal-foundation__group-heading">
            <h2>{group}</h2>
            <span>{members.length} specimens</span>
          </div>
          <div className="discern-catalogue-terminal-foundation__grid">
            {members.map((specimen) => (
              <article
                className="discern-catalogue-terminal-foundation__specimen"
                id={`terminal-foundation-${sheet.id}-${specimen.id}`}
                data-discern-terminal-foundation-specimen={specimen.id}
                key={specimen.id}
              >
                <div className="discern-catalogue-terminal-foundation__specimen-heading">
                  <h3>{specimen.title}</h3>
                  <a
                    href={`#terminal-foundation-${sheet.id}-${specimen.id}`}
                    aria-label={`Link to ${specimen.title}`}
                  >
                    #
                  </a>
                </div>
                {specimen.animation === undefined
                  ? (
                    <CliOutputPreview
                      value={specimen.output}
                      label={`${sheet.title}: ${specimen.title} output`}
                      theme={theme}
                    />
                  )
                  : (
                    <div className="discern-catalogue-terminal-foundation__evidence-pair">
                      <AnimatedTerminalSpecimen
                        animation={specimen.animation}
                        sheetTitle={sheet.title}
                        specimenTitle={specimen.title}
                        theme={theme}
                      />
                      <div className="discern-catalogue-terminal-foundation__static">
                        <span className="discern-catalogue-terminal-foundation__label">
                          Complete frame set
                        </span>
                        <CliOutputPreview
                          value={specimen.output}
                          label={`${sheet.title}: ${specimen.title} complete frame set`}
                          theme={theme}
                        />
                      </div>
                    </div>
                  )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
