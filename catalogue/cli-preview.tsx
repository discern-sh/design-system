import type { CSSProperties } from "react";
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { resolveCliExampleCapabilities } from "../src/cli/contracts.ts";
import { projectTerminalInlineHtml } from "../src/cli/projection.ts";
import { OverflowCue } from "../src/components/layout/overflow-cue/overflow-cue.tsx";
import type { RegistryEntry } from "./generated/registry.ts";
import { catalogueDecisionCopyProps } from "./metadata-copy.ts";
import { appearanceProjection } from "../src/tokens/appearance.ts";
import type { CatalogueTerminalPresentation } from "./terminal-theme.ts";

/** Fixed terminal profile used for deterministic Catalogue specimens. */
export const catalogueCliCapabilities = {
  ansiControl: true,
  colorDepth: "truecolor",
  columns: 80,
  unicode: true,
} as const satisfies TerminalCapabilities;

/** Project one bare terminal frame through the Catalogue's shared ANSI host. */
export function CliOutputPreview(
  { value, label, presentation }: {
    readonly value: string;
    readonly label: string;
    readonly presentation: CatalogueTerminalPresentation;
  },
) {
  const accent = presentation.appearance.accent;
  const accentStyle = accent === undefined
    ? undefined
    : { "--discern-accent-hue": accent } as CSSProperties;
  return (
    <OverflowCue
      axis="inline"
      scrollContainer="descendant"
      className="discern-catalogue-cli-preview"
      data-discern-root
      data-discern-theme={presentation.theme}
      data-discern-accent={accent === undefined ? undefined : ""}
      data-discern-terminal-ground={presentation.theme}
      data-discern-terminal-appearance={appearanceProjection(
        presentation.appearance,
      )}
      data-discern-terminal-accent-hue={accent}
      style={accentStyle}
    >
      <pre
        className="discern-catalogue-cli-output"
        aria-label={label}
        tabIndex={0}
        data-discern-overflow-cue-target=""
      >
        <code
          dangerouslySetInnerHTML={{
            __html: projectTerminalInlineHtml(value),
          }}
        />
      </pre>
    </OverflowCue>
  );
}

export function cliFragmentId(component: string, state: string): string {
  return `component-${component}--cli-${state}`;
}

/** Render one named canonical CLI example, preserving its stable deep link. */
export function CliExamplePreview(
  { entry, exampleId, presentation, headingLevel = 5 }: {
    readonly entry: RegistryEntry;
    readonly exampleId: string;
    readonly presentation: CatalogueTerminalPresentation;
    readonly headingLevel?: 4 | 5;
  },
) {
  const { cli, meta } = entry;
  if (cli.stance === "exempt") return null;
  const example = cli.examples.find(({ id }) => id === exampleId);
  if (example === undefined) return null;
  const fragmentId = cliFragmentId(meta.slug, example.id);
  const output = cli.render(
    catalogueCliExampleProps(meta.slug, example.props, presentation),
    resolveCliExampleCapabilities(example, catalogueCliCapabilities),
  );
  const Heading = headingLevel === 4 ? "h4" : "h5";
  return (
    <section
      className="discern-catalogue-example-state"
      id={fragmentId}
      data-discern-cli-example-state={example.id}
    >
      <header>
        <Heading>{example.label}</Heading>
        <a
          href={`#${fragmentId}`}
          aria-label={`Link to ${meta.name}: CLI ${example.label}`}
        >
          #
        </a>
      </header>
      <CliOutputPreview
        value={output}
        label={`${meta.name}: ${example.label} CLI output`}
        presentation={presentation}
      />
    </section>
  );
}

/** Bind one canonical example to the shared public terminal presentation. */
export function catalogueCliExampleProps(
  component: string,
  props: unknown,
  presentation: CatalogueTerminalPresentation,
): Readonly<Record<string, unknown>> {
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    throw new TypeError("Catalogue CLI example props must be an object");
  }
  const example = props as Readonly<Record<string, unknown>>;
  // Theme toggle uses `theme` for its authored current-state example and
  // `palette` for terminal colour; every other renderer uses `theme` itself.
  return component === "theme-toggle"
    ? {
      ...example,
      palette: presentation.theme,
      appearance: presentation.appearance,
    }
    : { ...example, ...presentation };
}

/** Render one Component's real CLI Catalogue examples as bare terminal output. */
export function CliComponentPreview(
  { entry, presentation }: {
    readonly entry: RegistryEntry;
    readonly presentation: CatalogueTerminalPresentation;
  },
) {
  const { cli, meta } = entry;
  if (cli.stance === "exempt") {
    const fragmentId = cliFragmentId(meta.slug, "exempt");
    return (
      <div className="discern-catalogue-component__canvas">
        <section
          className="discern-catalogue-example-state"
          id={fragmentId}
          data-discern-cli-example-state="exempt"
        >
          <header>
            <h5>Reasoned exemption</h5>
            <a
              href={`#${fragmentId}`}
              aria-label={`Link to ${meta.name}: CLI exemption`}
            >
              #
            </a>
          </header>
          <div className="discern-catalogue-cli-exemption">
            <span aria-hidden="true">—</span>
            <div>
              <strong>No CLI renderer</strong>
              <p {...catalogueDecisionCopyProps}>{cli.reason}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="discern-catalogue-component__canvas">
      {cli.examples.map(({ id }) => (
        <CliExamplePreview
          entry={entry}
          exampleId={id}
          presentation={presentation}
          key={id}
        />
      ))}
    </div>
  );
}
