import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import {
  componentCssHits,
  type CssDeclaration,
  cssDeclarations,
} from "../discern/scripts/component-css-metrics.ts";
import { missingWitnessHits } from "../discern/scripts/measure-missing-witnesses.ts";
import { rawSpacingHits } from "../discern/scripts/measure-raw-spacing.ts";
import {
  untokenisedStructureHits,
} from "../discern/scripts/measure-untokenised-structure.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");
const loudAccent = /var\(\s*--discern-color-accent-(?:400|500|600|700|800)\b/u;
const onAction = /^var\(\s*--discern-color-on-action\s*\)$/u;
const primaryAction = /var\(\s*--discern-color-action\s*\)/u;
const primaryActionShadow = /var\(\s*--discern-color-action-shadow\s*\)/u;
const rawColor =
  /#[\da-fA-F]{3,8}\b|\b(?:rgb|hsl|hwb|lab|lch|oklab|oklch)\(|\b(?:black|white|Canvas|CanvasText|Highlight)\b/u;
const pixel = /-?(?:\d+\.)?\d+px\b/gu;

interface CssRule {
  readonly file: string;
  readonly line: number;
  readonly selector: string;
  readonly declarations: readonly CssDeclaration[];
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function cssRules(source: string, file: string): readonly CssRule[] {
  const rules: CssRule[] = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    if (match.index === undefined) continue;
    const selector = match[1]?.trim();
    const body = match[2];
    if (
      selector === undefined || body === undefined || selector.startsWith("@")
    ) {
      continue;
    }
    rules.push({
      file,
      line: lineAt(source, match.index),
      selector,
      declarations: cssDeclarations(body, file),
    });
  }
  return rules;
}

function loudAccentTextViolations(
  rules: readonly CssRule[],
): readonly string[] {
  return rules.flatMap((rule) => {
    const background = rule.declarations.find(({ property, value }) =>
      (property === "background" || property === "background-color") &&
      loudAccent.test(value)
    );
    if (background === undefined) return [];
    const color = rule.declarations.find(({ property }) =>
      property === "color"
    );
    if (color === undefined || onAction.test(color.value)) return [];
    return [
      `${rule.file}:${rule.line}: ${rule.selector} paints ${background.value} with ${color.value}`,
    ];
  });
}

function rawLiteralViolations(
  stylesheets: ReadonlyMap<string, string>,
): readonly string[] {
  const violations: string[] = [];
  for (const [file, css] of stylesheets) {
    for (const match of css.matchAll(pixel)) {
      if (match.index === undefined) continue;
      const value = Number.parseFloat(match[0]);
      if (value === 0 || Math.abs(value) === 1) continue;
      violations.push(`${file}:${lineAt(css, match.index)}: ${match[0]}`);
    }
    for (const rule of cssRules(css, file)) {
      for (const declaration of rule.declarations) {
        if (rawColor.test(declaration.value)) {
          violations.push(
            `${file}:${rule.line}: ${declaration.property}: ${declaration.value}`,
          );
        }
      }
    }
  }
  return violations;
}

function hardPrimaryShadowViolations(
  rules: readonly CssRule[],
): readonly string[] {
  return rules.flatMap((rule) => {
    const fill = rule.declarations.find(({ property, value }) =>
      (property === "background" || property === "background-color" ||
        property.includes("fill")) && primaryAction.test(value)
    );
    if (fill === undefined) return [];
    const shadows = rule.declarations.filter(({ property }) =>
      property === "box-shadow" || property.includes("shadow")
    );
    if (
      shadows.length === 0 ||
      shadows.some(({ value }) => primaryActionShadow.test(value))
    ) return [];
    return [
      `${rule.file}:${rule.line}: ${rule.selector} gives a primary action a hard shadow without --discern-color-action-shadow`,
    ];
  });
}

async function componentStylesheets(
  directory: string,
): Promise<ReadonlyMap<string, string>> {
  const stylesheets = new Map<string, string>();
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) {
      for (const [childPath, css] of await componentStylesheets(path)) {
        stylesheets.set(childPath, css);
      }
    } else if (entry.isFile && entry.name.endsWith(".css")) {
      stylesheets.set(
        relative(PACKAGE_ROOT, path),
        await Deno.readTextFile(path),
      );
    }
  }
  return stylesheets;
}

Deno.test("Component CSS keeps density and structure on the appearance authorities", async () => {
  assertEquals(await componentCssHits(rawSpacingHits), []);
  assertEquals(await componentCssHits(untokenisedStructureHits), []);
});

Deno.test("Component CSS contains no theme branch or loud-rung text pairing", async () => {
  const themeBranches: string[] = [];
  const loudText: string[] = [];
  for (const [file, css] of await componentStylesheets(COMPONENT_ROOT)) {
    if (css.includes("light-dark(")) themeBranches.push(file);
    loudText.push(...loudAccentTextViolations(cssRules(css, file)));
  }
  assertEquals(themeBranches, []);
  assertEquals(loudText, []);
});

Deno.test("hard-shadow primary actions consume the enrolled shadow role", async () => {
  const violations: string[] = [];
  for (const [file, css] of await componentStylesheets(COMPONENT_ROOT)) {
    violations.push(...hardPrimaryShadowViolations(cssRules(css, file)));
  }
  assertEquals(violations, []);
});

Deno.test("Component CSS contains no non-hairline pixel or colour literal", async () => {
  assertEquals(
    rawLiteralViolations(await componentStylesheets(COMPONENT_ROOT)),
    [],
  );
});

Deno.test("a future Component cannot reintroduce raw field literals", () => {
  const fixture = new Map([
    [
      "src/components/core/future-field/future-field.css",
      `.discern-future-field {
        margin: 6px;
        border: 1px solid var(--discern-color-border);
        background: rgb(10 20 30);
      }`,
    ],
  ]);
  assertEquals(rawLiteralViolations(fixture), [
    "src/components/core/future-field/future-field.css:2: 6px",
    "src/components/core/future-field/future-field.css:1: background: rgb(10 20 30)",
  ]);
});

Deno.test("a future Component cannot bypass the action pair on a loud fill", () => {
  const fixture = cssRules(
    `
    .discern-future-action {
      background: var(--discern-color-accent-600);
      color: var(--discern-color-inverse-ink);
    }
    .discern-future-action--safe {
      background-color: var(--discern-color-accent-400);
      color: var(--discern-color-on-action);
    }
  `,
    "src/components/core/future-action/future-action.css",
  );
  assertEquals(loudAccentTextViolations(fixture), [
    "src/components/core/future-action/future-action.css:1: .discern-future-action paints var(--discern-color-accent-600) with var(--discern-color-inverse-ink)",
  ]);
});

Deno.test("a future hard-shadow primary action auto-enrols in the shadow guard", () => {
  const fixture = cssRules(
    `
    .discern-future-action {
      --discern-future-fill: var(--discern-color-action);
      --discern-future-shadow: 2px 2px 0 var(--discern-color-action);
      background: var(--discern-future-fill);
      box-shadow: var(--discern-future-shadow);
    }
  `,
    "src/components/core/future-action/future-action.css",
  );
  assertEquals(hardPrimaryShadowViolations(fixture), [
    "src/components/core/future-action/future-action.css:1: .discern-future-action gives a primary action a hard shadow without --discern-color-action-shadow",
  ]);
});

Deno.test("canonical Web status and tone elements retain a non-colour witness", async () => {
  assertEquals(await missingWitnessHits(), []);
});
