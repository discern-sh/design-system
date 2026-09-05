import { useState } from "react";
import type { CSSProperties } from "react";
import { renderBox } from "../../../src/cli/box.ts";
import { Button } from "../../../src/components/core/button/button.tsx";
import { Icon } from "../../../src/components/core/icon/icon.tsx";
import { CodeBlock } from "../../../src/components/editorial/code-block/code-block.tsx";
import { CopyButton } from "../../../src/components/docs/copy-button/copy-button.tsx";
import { Input } from "../../../src/components/forms/input/input.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
import {
  getGlyph,
  isGlyphName,
  resolveGlyph,
} from "../../../src/glyphs/mod.ts";
import type { GlyphRepertoire } from "../../../src/glyphs/mod.ts";
import type { GlyphCatalogueEntry } from "../../routes.ts";
import {
  glyphBrowserFontRoles,
  glyphJavaScriptEscape,
} from "./presentation.ts";

/** Copyable examples consume the same public resolver as the live specimen. */
export function glyphUsageSource(
  name: string,
  label: string,
  format: "javascript" | "react" | "terminal",
  repertoire: GlyphRepertoire = "unicode",
): string {
  const quotedName = JSON.stringify(name);
  const quotedLabel = JSON.stringify(label);
  const resolve = `const glyph = resolveGlyph(${quotedName}, ${
    JSON.stringify(repertoire)
  });`;
  const importResolver =
    'import { resolveGlyph } from "@discern-sh/design-system/glyphs";';
  if (format === "javascript") {
    return repertoire === "unicode"
      ? `import { getGlyph } from "@discern-sh/design-system/glyphs";\n\nconst glyph = getGlyph(${quotedName});\nconsole.log(glyph.unicode);`
      : `${importResolver}\n\n${resolve}\nconsole.log(glyph.available ? glyph.text : ${quotedLabel});`;
  }
  if (format === "react") {
    return `${importResolver}\nimport { Button, Icon } from "@discern-sh/design-system/react";\n\n${resolve}\nconst label = ${quotedLabel};\nconst mark = glyph.available && glyph.text.toLowerCase() !== label.toLowerCase() ? glyph.text : "";\n\n<Button leadingIcon={mark ? <Icon size="auto">{mark}</Icon> : undefined}>\n  {label}\n</Button>`;
  }
  return `${importResolver}\nimport { renderBox } from "@discern-sh/design-system/cli";\n\nconst capabilities = { columns: 40, colorDepth: "none", unicode: ${
    repertoire === "unicode"
  } } as const;\nconst glyph = resolveGlyph(${quotedName}, capabilities.unicode ? "unicode" : "ascii");\nconst label = ${quotedLabel};\nconst mark = glyph.available && glyph.text.toLowerCase() !== label.toLowerCase() ? glyph.text : "";\nconsole.log(renderBox({ body: mark ? mark + " " + label : label }, capabilities));`;
}

export function GlyphWorkbench({ entry, currentUrl }: {
  readonly entry: GlyphCatalogueEntry;
  readonly currentUrl: URL;
}) {
  const published = entry.aliases.filter(({ name }) => isGlyphName(name));
  const [name, setName] = useState(() =>
    published.find((alias) => alias.name === currentUrl.searchParams.get("use"))
      ?.name ?? published[0]?.name ?? ""
  );
  const alias = published.find((candidate) => candidate.name === name);
  const [label, setLabel] = useState(alias?.discoveryTitle ?? "Example label");
  const [font, setFont] = useState("--discern-font-ui");
  const [size, setSize] = useState("24");
  const [repertoire, setRepertoire] = useState<GlyphRepertoire>("unicode");
  const [format, setFormat] = useState<"javascript" | "react" | "terminal">(
    "javascript",
  );
  const [activated, setActivated] = useState(false);
  const glyph = isGlyphName(name) ? getGlyph(name) : undefined;
  const resolution = isGlyphName(name)
    ? resolveGlyph(name, repertoire)
    : undefined;
  const text = resolution?.available
    ? resolution.text
    : glyph === undefined && repertoire === "unicode"
    ? entry.canonical.text
    : "";
  const meaningfulLabel = label.trim() || "Example label";
  const capabilities = {
    columns: 40,
    colorDepth: "none",
    unicode: repertoire === "unicode",
  } as const;
  const mark = text.toLowerCase() === meaningfulLabel.toLowerCase() ? "" : text;
  const terminal = renderBox({
    body: mark === "" ? meaningfulLabel : `${mark} ${meaningfulLabel}`,
  }, capabilities);
  const source = glyph === undefined
    ? `const glyph = "${glyphJavaScriptEscape(entry.canonical)}";`
    : glyphUsageSource(name, meaningfulLabel, format, repertoire);
  return (
    <section
      className="discern-catalogue-glyph-workbench"
      aria-labelledby="glyph-workbench-title"
    >
      <div className="discern-catalogue-glyph-section-heading">
        <div>
          <p className="discern-catalogue-glyph-eyebrow">Try it in context</p>
          <h2 id="glyph-workbench-title">A glyph at work.</h2>
        </div>
        <span>
          {glyph === undefined ? "Reference specimen" : "Available in ./glyphs"}
        </span>
      </div>
      <div className="discern-catalogue-glyph-workbench__controls">
        {published.length > 0
          ? (
            <Select
              label="Use as"
              value={name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setName(value);
                setLabel(
                  published.find((item) => item.name === value)
                    ?.discoveryTitle ?? "Example label",
                );
                const url = new URL(globalThis.location.href);
                url.searchParams.set("use", value);
                globalThis.history.replaceState(null, "", url);
              }}
            >
              {published.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.discoveryTitle} · {item.name}
                </option>
              ))}
            </Select>
          )
          : null}
        <Input
          label="Example label"
          value={label}
          maxLength={100}
          onChange={(event) => setLabel(event.currentTarget.value)}
        />
        <Select
          label="Specimen font"
          value={font}
          onChange={(event) => setFont(event.currentTarget.value)}
        >
          {glyphBrowserFontRoles().map((role) => (
            <option key={role.token} value={role.token}>{role.label}</option>
          ))}
        </Select>
        <Select
          label="Specimen size"
          value={size}
          onChange={(event) => setSize(event.currentTarget.value)}
        >
          {[12, 16, 20, 24, 32, 48, 64].map((value) => (
            <option key={value} value={value}>{value} px</option>
          ))}
        </Select>
        <Select
          label="Character repertoire"
          value={repertoire}
          onChange={(event) =>
            setRepertoire(
              event.currentTarget.value === "ascii" ? "ascii" : "unicode",
            )}
        >
          <option value="unicode">Unicode</option>
          <option value="ascii">ASCII fallback</option>
        </Select>
      </div>
      <div className="discern-catalogue-glyph-workbench__stages">
        <div
          className="discern-catalogue-glyph-workbench__browser"
          style={{
            fontFamily: `var(${font})`,
            "--discern-glyph-workbench-size": `${size}px`,
          } as CSSProperties}
        >
          <p className="discern-catalogue-glyph-workbench__caption">
            Browser · current fonts
          </p>
          <p className="discern-catalogue-glyph-workbench__line">
            <span aria-hidden="true">{mark}</span> {meaningfulLabel}
          </p>
          <Button
            leadingIcon={mark === ""
              ? undefined
              : <Icon size="auto">{mark}</Icon>}
            onClick={() => setActivated(!activated)}
          >
            {meaningfulLabel}
          </Button>
          <p
            className="discern-catalogue-glyph-workbench__caption"
            role="status"
          >
            {activated
              ? "Example action activated."
              : "A decorative glyph, with the label carrying the meaning."}
          </p>
        </div>
        <div className="discern-catalogue-glyph-workbench__terminal">
          <p className="discern-catalogue-glyph-workbench__caption">
            Terminal · 40 columns · {repertoire}
          </p>
          <CodeBlock
            code={terminal}
            aria-label="Terminal glyph specimen"
          />
          <p
            className="discern-catalogue-glyph-workbench__caption"
            aria-live="polite"
          >
            {resolution?.available
              ? `${resolution.columns} cell${
                resolution.columns === 1 ? "" : "s"
              } · ${resolution.fidelity} ${
                repertoire === "ascii" ? "fallback" : "sequence"
              }`
              : repertoire === "ascii"
              ? "No approved ASCII fallback. This example keeps the label."
              : `${entry.canonical.terminalWidth} cells under narrow-A measurement.`}
          </p>
        </div>
      </div>
      {glyph?.ascii !== undefined && repertoire === "ascii" &&
          alias?.surfaces.terminal.posture === "supported"
        ? (
          <p className="discern-catalogue-glyph-workbench__guidance">
            {alias.surfaces.terminal.asciiFallback.guidance}
          </p>
        )
        : null}
      <div className="discern-catalogue-glyph-workbench__code">
        <div
          className="discern-catalogue-glyph-workbench__formats"
          role="group"
          aria-label="Code example format"
        >
          {glyph === undefined
            ? <span>Exact JavaScript string</span>
            : ([["javascript", "JavaScript"], ["react", "React"], [
              "terminal",
              "Terminal",
            ]] as const).map(([value, title]) => (
              <Button
                key={value}
                size="sm"
                variant={value === format ? "primary" : "ghost"}
                aria-pressed={value === format}
                onClick={() => setFormat(value)}
              >
                {title}
              </Button>
            ))}
          <CopyButton
            value={source}
            label="Copy usage example"
            copiedLabel="Usage example copied"
          />
        </div>
        <CodeBlock
          code={source}
          language={format === "react" ? "tsx" : "ts"}
          aria-label="Usage example"
        />
      </div>
    </section>
  );
}
