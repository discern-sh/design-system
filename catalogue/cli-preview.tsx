import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { resolveCliExampleCapabilities } from "../src/cli/contracts.ts";
import { projectTerminalInlineHtml } from "../src/cli/projection.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import type { RegistryEntry } from "./generated/registry.ts";

/** Fixed terminal profile used for deterministic Catalogue specimens. */
export const catalogueCliCapabilities = {
  ansiControl: true,
  colorDepth: "truecolor",
  columns: 80,
  unicode: true,
} as const satisfies TerminalCapabilities;

function exampleLabel(name: string): string {
  const label = name.replaceAll("-", " ");
  return `${label.slice(0, 1).toUpperCase()}${label.slice(1)}`;
}

/** Project one bare terminal frame through the Catalogue's shared ANSI host. */
export function CliOutputPreview(
  { value, label, theme }: {
    readonly value: string;
    readonly label: string;
    readonly theme: TerminalThemeVariant;
  },
) {
  return (
    <div
      className="discern-catalogue-cli-preview"
      data-discern-root
      data-discern-theme={theme}
    >
      <pre className="discern-catalogue-cli-output" aria-label={label}>
        <code
          dangerouslySetInnerHTML={{
            __html: projectTerminalInlineHtml(value),
          }}
        />
      </pre>
    </div>
  );
}

function cliFragmentId(component: string, state: string): string {
  return `component-${component}--cli-${state}`;
}

function terminalThemeProps(
  component: string,
  props: unknown,
  theme: TerminalThemeVariant,
): Readonly<Record<string, unknown>> {
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    throw new TypeError("Catalogue CLI example props must be an object");
  }
  const example = props as Readonly<Record<string, unknown>>;
  // Theme toggle uses `theme` for its authored current-state example and
  // `palette` for terminal colour; every other renderer uses `theme` itself.
  return component === "theme-toggle"
    ? { ...example, palette: theme }
    : { ...example, theme };
}

/** Render one Component's real CLI Catalogue examples as bare terminal output. */
export function CliComponentPreview(
  { entry, theme }: {
    readonly entry: RegistryEntry;
    readonly theme: TerminalThemeVariant;
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
              <p>{cli.reason}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="discern-catalogue-component__canvas">
      {cli.examples.map((example) => {
        const { name, props } = example;
        const label = exampleLabel(name);
        const fragmentId = cliFragmentId(meta.slug, name);
        const output = cli.render(
          terminalThemeProps(meta.slug, props, theme),
          resolveCliExampleCapabilities(example, catalogueCliCapabilities),
        );
        return (
          <section
            className="discern-catalogue-example-state"
            id={fragmentId}
            data-discern-cli-example-state={name}
            key={name}
          >
            <header>
              <h5>{label}</h5>
              <a
                href={`#${fragmentId}`}
                aria-label={`Link to ${meta.name}: CLI ${label}`}
              >
                #
              </a>
            </header>
            <CliOutputPreview
              value={output}
              label={`${meta.name}: ${label} CLI output`}
              theme={theme}
            />
          </section>
        );
      })}
    </div>
  );
}
