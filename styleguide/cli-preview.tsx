import type { CSSProperties } from "react";
import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import { Terminal } from "../src/components/display/terminal/terminal.tsx";
import type { RegistryEntry } from "./generated/registry.ts";
import { parseTerminalAnsi, type TerminalAnsiStyle } from "./terminal-ansi.ts";

/** Fixed terminal profile used for deterministic browser specimens. */
export const catalogueCliCapabilities = {
  colorDepth: "truecolor",
  columns: 80,
  unicode: true,
} as const satisfies TerminalCapabilities;

function exampleLabel(name: string): string {
  const label = name.replaceAll("-", " ");
  return `${label.slice(0, 1).toUpperCase()}${label.slice(1)}`;
}

function browserStyle(style: TerminalAnsiStyle): CSSProperties {
  const decoration = [
    style.underline === true ? "underline" : undefined,
    style.strikethrough === true ? "line-through" : undefined,
  ].filter((value) => value !== undefined).join(" ");
  return {
    color: style.color,
    fontStyle: style.italic === true ? "italic" : undefined,
    fontWeight: style.bold === true ? 700 : undefined,
    opacity: style.dim === true ? 0.68 : undefined,
    textDecorationLine: decoration || undefined,
  };
}

function TerminalAnsiText({ value }: { readonly value: string }) {
  return parseTerminalAnsi(value).map(({ text, style }, index) =>
    style === undefined
      ? text
      : <span style={browserStyle(style)} key={index}>{text}</span>
  );
}

function cliFragmentId(component: string, state: string): string {
  return `component-${component}--cli-${state}`;
}

/** Render one Component's real CLI Catalogue examples into browser terminals. */
export function CliComponentPreview(
  { entry }: { readonly entry: RegistryEntry },
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
      {cli.examples.map(({ name, props }) => {
        const label = exampleLabel(name);
        const fragmentId = cliFragmentId(meta.slug, name);
        const output = cli.render(props, catalogueCliCapabilities);
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
            <div
              className="discern-catalogue-cli-terminal"
              data-discern-root
              data-discern-theme="dark"
            >
              <Terminal
                title={`${meta.name} · 80 columns · truecolour · Unicode`}
                bodyStyle={{ minBlockSize: 0 }}
                aria-label={`${meta.name}: ${label} CLI output`}
              >
                <TerminalAnsiText value={output} />
              </Terminal>
            </div>
          </section>
        );
      })}
    </div>
  );
}
