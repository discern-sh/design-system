import {
  assertEquals,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";
import { join, relative } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import ThemeSwitcherExamples from "../src/components/core/theme-switcher/theme-switcher.examples.tsx";
import { ThemeSwitcher } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { DocsNav } from "../src/components/docs/docs-nav/docs-nav.tsx";

const PACKAGE_ROOT = new URL("..", import.meta.url);
const CATALOGUE_ROOT = new URL("../catalogue/", import.meta.url);

interface NativeSelectLocation {
  readonly line: number;
  readonly column: number;
}

interface SourceToken {
  readonly kind: "identifier" | "punctuation" | "string";
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

function canStartRegularExpression(tokens: readonly SourceToken[]): boolean {
  const previous = tokens.at(-1);
  if (previous === undefined) return true;
  if (
    previous.kind === "identifier" &&
    [
      "case",
      "delete",
      "do",
      "else",
      "in",
      "of",
      "return",
      "throw",
      "typeof",
      "void",
      "yield",
    ]
      .includes(previous.value)
  ) return true;
  if (
    previous.kind === "punctuation" &&
    [
      "(",
      "[",
      "{",
      ",",
      ";",
      "=",
      ":",
      "!",
      "?",
      "&",
      "|",
      "+",
      "-",
      "*",
      "%",
      "~",
    ]
      .includes(previous.value)
  ) return true;
  return previous.value === ">" && tokens.at(-2)?.value === "=";
}

/** Tokenize only the TypeScript/TSX forms relevant to native-control creation. */
function sourceTokens(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  const templateDepths: number[] = [];
  let state: "code" | "template" = "code";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1];
    if (state === "template") {
      if (character === "\\") {
        index += 1;
      } else if (character === "`") {
        templateDepths.pop();
        state = "code";
      } else if (character === "$" && next === "{") {
        templateDepths[templateDepths.length - 1] = 1;
        state = "code";
        index += 1;
      }
      continue;
    }

    const templateDepth = templateDepths.at(-1);
    if (templateDepth !== undefined && templateDepth > 0) {
      if (character === "{") {
        templateDepths[templateDepths.length - 1] = templateDepth + 1;
      } else if (character === "}") {
        if (templateDepth === 1) {
          templateDepths[templateDepths.length - 1] = 0;
          state = "template";
          continue;
        }
        templateDepths[templateDepths.length - 1] = templateDepth - 1;
      }
    }
    if (/\s/.test(character)) continue;
    if (character === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) index += 1;
      index += 1;
      continue;
    }
    if (character === "`") {
      templateDepths.push(0);
      state = "template";
      continue;
    }
    if (character === "'" || character === '"') {
      const start = index;
      const quote = character;
      let value = "";
      index += 1;
      for (; index < source.length; index += 1) {
        const current = source[index] ?? "";
        if (current === "\\") {
          value += current + (source[index + 1] ?? "");
          index += 1;
        } else if (current === quote) {
          break;
        } else {
          value += current;
        }
      }
      tokens.push({ kind: "string", value, start, end: index + 1 });
      continue;
    }
    if (
      character === "/" && next !== "/" && next !== "*" &&
      canStartRegularExpression(tokens)
    ) {
      let escaped = false;
      let inCharacterClass = false;
      index += 1;
      for (; index < source.length; index += 1) {
        const current = source[index] ?? "";
        if (escaped) escaped = false;
        else if (current === "\\") escaped = true;
        else if (current === "[") inCharacterClass = true;
        else if (current === "]") inCharacterClass = false;
        else if (current === "/" && !inCharacterClass) break;
      }
      while (/[a-z]/i.test(source[index + 1] ?? "")) index += 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(character)) {
      const start = index;
      while (/[A-Za-z0-9_$]/.test(source[index + 1] ?? "")) index += 1;
      tokens.push({
        kind: "identifier",
        value: source.slice(start, index + 1),
        start,
        end: index + 1,
      });
      continue;
    }
    tokens.push({
      kind: "punctuation",
      value: character,
      start: index,
      end: index + 1,
    });
  }
  return tokens;
}

function sourceLocation(source: string, offset: number): NativeSelectLocation {
  const lines = source.slice(0, offset).split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/** Find raw JSX and literal createElement native-select construction. */
function nativeSelectLocations(source: string): NativeSelectLocation[] {
  const tokens = sourceTokens(source);
  const offsets = new Set<number>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (
      token?.value === "<" && next?.kind === "identifier" &&
      next.value === "select" && token.end === next.start
    ) offsets.add(token.start);
    if (
      token?.kind === "identifier" && token.value === "createElement" &&
      next?.value === "(" && tokens[index + 2]?.kind === "string" &&
      tokens[index + 2]?.value === "select"
    ) offsets.add(token.start);
  }
  const locations = [...offsets].toSorted((left, right) => left - right).map(
    (offset) => sourceLocation(source, offset),
  );
  return locations;
}

async function catalogueReactSources(
  directory: string,
): Promise<readonly string[]> {
  const paths: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) paths.push(...await catalogueReactSources(path));
    else if (entry.isFile && entry.name.endsWith(".tsx")) paths.push(path);
  }
  return paths.toSorted();
}

Deno.test("Catalogue React surfaces use the public Select instead of raw controls", async () => {
  const violations: string[] = [];
  for (const path of await catalogueReactSources(CATALOGUE_ROOT.pathname)) {
    const source = await Deno.readTextFile(path);
    for (const location of nativeSelectLocations(source)) {
      violations.push(
        `${
          relative(PACKAGE_ROOT.pathname, path)
        }:${location.line}:${location.column}`,
      );
    }
  }
  assertEquals(violations, []);
});

Deno.test("synthetic future Catalogue surfaces cannot reintroduce native selects", () => {
  const futureSurface = `
    const quoted = "<select>not JSX</select>";
    const templated = \`<select>not JSX</select>\`;
    const matched = /<select data-future>/;
    // <select>nor is this</select>
    export function UnrelatedFutureFilter(rest: Record<string, unknown>) {
      return (
        <section>
          <select
            name="region"
            {...rest}
          >
            <option>Any</option>
          </select>
        </section>
      );
    }
    export const FutureFactory = () => React.createElement(
      "select",
      { name: "factory-region" },
    );
    export const FutureTemplateExpression = (enabled: boolean) =>
      \`result: \${enabled ? <select name="embedded" /> : "none"}\`;
  `;
  assertEquals(nativeSelectLocations(futureSurface), [
    { line: 9, column: 11 },
    { line: 18, column: 46 },
    { line: 23, column: 28 },
  ]);
});

Deno.test("Docs nav preserves page and location current semantics", () => {
  const html = renderToStaticMarkup(
    <DocsNav
      sections={[{
        items: [
          { label: "Components", href: "/components", current: true },
          {
            label: "Layout",
            href: "/components?group=layout",
            current: "location",
          },
          { label: "Display", href: "/components?group=display" },
        ],
      }]}
    />,
  );
  assertStringIncludes(
    html,
    '<a href="/components" aria-current="page">Components</a>',
  );
  assertStringIncludes(
    html,
    '<a href="/components?group=layout" aria-current="location">Layout</a>',
  );
  assertNotMatch(html, /aria-current="false"/);
});

Deno.test("the Theme switcher example says Auto without changing the public default", () => {
  const html = renderToStaticMarkup(<ThemeSwitcherExamples />);
  assertStringIncludes(html, "<span>Auto</span>");
  assertNotMatch(html, /Use this device|preference<\/span>/);

  const defaultHtml = renderToStaticMarkup(
    <ThemeSwitcher onModeChange={() => undefined} />,
  );
  assertStringIncludes(defaultHtml, "<span>System</span>");
});
