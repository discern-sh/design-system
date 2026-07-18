import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join, relative, toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSources } from "../scripts/generate.ts";
import { packageManifest } from "../src/manifest.ts";
import { Breadcrumbs, Button } from "../src/react.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { semanticClass } from "../src/semantic-class.ts";
import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../src/tokens/tokens.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";

const PACKAGE_ROOT_URL = new URL("../", import.meta.url);
const PACKAGE_ROOT = fromFileUrl(PACKAGE_ROOT_URL);
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");

async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) files.push(...await walk(path));
    else files.push(path);
  }
  return files.toSorted();
}

async function outputPaths(root: string): Promise<string[]> {
  return (await walk(root)).map((path) => relative(root, path)).toSorted();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", input.buffer),
  );
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function command(
  cwd: string,
  args: readonly string[],
): Promise<string> {
  const result = await new Deno.Command(Deno.execPath(), {
    cwd,
    args: [...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  assert(result.success, `${args.join(" ")}\n${stdout}\n${stderr}`);
  return stdout;
}

interface PublicCssGlobals {
  readonly classes: ReadonlySet<string>;
  readonly customProperties: ReadonlySet<string>;
  readonly dataAttributes: ReadonlySet<string>;
  readonly keyframes: ReadonlySet<string>;
}

function publicCssGlobals(source: string): PublicCssGlobals {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectorPrelude = [...css.matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1] ?? "")
    .filter((prelude) => !prelude.trimStart().startsWith("@"))
    .join("\n");
  return {
    classes: new Set(
      [...selectorPrelude.matchAll(/\.([_a-zA-Z][-_a-zA-Z0-9]*)/g)]
        .map((match) => match[1] ?? ""),
    ),
    customProperties: new Set(
      [...css.matchAll(/(?<![-_a-zA-Z0-9])(--[_a-zA-Z][-_a-zA-Z0-9]*)/g)]
        .map((match) => match[1] ?? ""),
    ),
    dataAttributes: new Set(
      [...css.matchAll(/\[(data-[_a-zA-Z][-_a-zA-Z0-9]*)/g)]
        .map((match) => match[1] ?? ""),
    ),
    keyframes: new Set(
      [...css.matchAll(/@keyframes\s+([_a-zA-Z][-_a-zA-Z0-9]*)/g)]
        .map((match) => match[1] ?? ""),
    ),
  };
}

interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

function parseOklch(value: string): Oklab {
  const match = value.match(
    /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/,
  );
  assert(match !== null, `expected concrete oklch(), received ${value}`);
  const l = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  return { l, a: chroma * Math.cos(radians), b: chroma * Math.sin(radians) };
}

function linearRgb(color: Oklab): readonly [number, number, number] {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function luminance(value: string): number {
  if (value === "#fff") return 1;
  const [red, green, blue] = linearRgb(parseOklch(value))
    .map((channel) => Math.max(0, Math.min(1, channel))) as [
      number,
      number,
      number,
    ];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].toSorted((a, b) =>
    b - a
  );
  const lighter = values[0] ?? 0;
  const darker = values[1] ?? 0;
  return (lighter + 0.05) / (darker + 0.05);
}

function distance(first: Oklab, second: Oklab): number {
  return Math.hypot(
    first.l - second.l,
    first.a - second.a,
    first.b - second.b,
  );
}

function themeValue(
  name: string,
  mode: "light" | "dark",
  overrides: ReadonlyMap<string, string>,
): string {
  const override = overrides.get(`${mode}:${name}`) ?? overrides.get(name);
  const token = themeTokens.find((candidate) => candidate.name === name);
  assert(
    override !== undefined || token !== undefined,
    `unknown token ${name}`,
  );
  const raw = override ?? (mode === "light" ? token?.light : token?.dark) ?? "";
  const values = new Map([
    ...baseTokens.map((item) => [item.name, item.value] as const),
    ...discernThemeTokens.map((item) => [item.name, item.value] as const),
    ...[...overrides.entries()].filter(([key]) => !key.includes(":")),
  ]);
  return raw.replace(
    /var\((--discern-[^)]+)\)/g,
    (_match, key: string) => values.get(key) ?? "0",
  );
}

function fixtureOverrides(source: string): Map<string, string> {
  const overrides = new Map<string, string>();
  const darkStart = source.indexOf('[data-discern-theme="dark"]');
  for (const match of source.matchAll(/(--discern-[\w-]+):\s*([^;]+);/g)) {
    const name = match[1] ?? "";
    const value = match[2]?.trim() ?? "";
    const offset = match.index ?? 0;
    overrides.set(
      darkStart >= 0 && offset > darkStart ? `dark:${name}` : name,
      value,
    );
  }
  return overrides;
}

Deno.test("package tests and tasks cannot reach above the package root", async () => {
  const config = await Deno.readTextFile(join(PACKAGE_ROOT, "deno.json"));
  assert(
    !config.includes('"../'),
    "package tasks must not target parent source",
  );
  const packagePrefix = PACKAGE_ROOT_URL.href;
  const violations: string[] = [];
  for (
    const path of (await walk(join(PACKAGE_ROOT, "tests"))).filter((
      candidate,
    ) => candidate.endsWith(".ts"))
  ) {
    const source = await Deno.readTextFile(path);
    const specifiers = [
      ...source.matchAll(/(?:from\s+|import\s*\()["'](\.\.?\/[^"']+)["']/g),
      ...source.matchAll(
        /new URL\(["'](\.\.?\/[^"']+)["'],\s*import\.meta\.url\)/g,
      ),
    ].map((match) => match[1] ?? "");
    for (const specifier of specifiers) {
      const resolved = new URL(specifier, toFileUrl(path));
      if (!resolved.href.startsWith(packagePrefix)) {
        violations.push(`${relative(PACKAGE_ROOT, path)} -> ${specifier}`);
      }
    }
  }
  assertEquals(violations, []);
});

Deno.test("component metadata auto-enrols React and runtime surfaces", async () => {
  const files = await walk(COMPONENT_ROOT);
  const fileSet = new Set(files);
  const metaFiles = files.filter((path) => path.endsWith(".meta.ts"));
  const identities = new Set<string>();
  const positions = new Set<string>();
  for (const metaPath of metaFiles) {
    const stem = metaPath.slice(0, -".meta.ts".length);
    const directory = stem.slice(0, stem.lastIndexOf("/"));
    const folder = directory.slice(directory.lastIndexOf("/") + 1);
    const module = await import(toFileUrl(metaPath).href) as {
      default: ComponentMeta;
    };
    const meta = module.default;
    assertEquals(meta.slug, folder, metaPath);
    assert(!identities.has(meta.slug), `duplicate component ${meta.slug}`);
    identities.add(meta.slug);
    const position = `${meta.group}:${meta.order}`;
    assert(
      !positions.has(position),
      `duplicate component position ${position}`,
    );
    positions.add(position);
    for (
      const sibling of [`${stem}.tsx`, `${stem}.css`, `${stem}.examples.tsx`]
    ) {
      assert(fileSet.has(sibling), `${metaPath} is missing ${sibling}`);
    }
    assert(
      fileSet.has(join(directory, "mod.ts")),
      `${metaPath} is missing mod.ts`,
    );
  }
  assert(metaFiles.length > 0);
  assertEquals(packageManifest.components.length, metaFiles.length);

  const generated = await generateSources();
  assertEquals(
    await Deno.readTextFile(
      join(PACKAGE_ROOT, "src", "generated", "component-registry.ts"),
    ),
    generated.registry,
  );
  assertEquals(
    await Deno.readTextFile(
      join(PACKAGE_ROOT, "src", "generated", "assets.ts"),
    ),
    generated.assets,
  );
  assertEquals(
    await Deno.readTextFile(
      join(PACKAGE_ROOT, "src", "generated", "react.ts"),
    ),
    generated.react,
  );
});

Deno.test("runtime globals are branded and defaults stay inside the opted-in root", async () => {
  const temp = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      all: true,
      assets: ["fonts", "grain"],
    });
    const authoredSources = (await walk(PACKAGE_ROOT)).filter((path) => {
      const packagePath = relative(PACKAGE_ROOT, path);
      return !packagePath.startsWith("tests/") &&
        !packagePath.startsWith("dist/") &&
        !packagePath.startsWith("node_modules/") &&
        /\.(?:css|html|json|md|ts|tsx)$/.test(path);
    });
    const generatedSources = (await walk(temp)).filter((path) =>
      /\.(?:css|json)$/.test(path)
    );
    for (const path of [...authoredSources, ...generatedSources]) {
      const source = await Deno.readTextFile(path);
      assert(
        !/(?:\.ds-|--ds-|data-ds-|@keyframes\s+ds-)/.test(source),
        `legacy public identifier in ${path}`,
      );
    }
    const runtimeCss = [...authoredSources, ...generatedSources].filter(
      (path) => path.endsWith(".css"),
    );
    const violations: string[] = [];
    for (const path of runtimeCss) {
      const source = await Deno.readTextFile(path);
      const globals = publicCssGlobals(source);
      for (const value of globals.classes) {
        if (!value.startsWith("discern-")) {
          violations.push(`${path}: .${value}`);
        }
      }
      for (const value of globals.customProperties) {
        if (!value.startsWith("--discern-")) {
          violations.push(`${path}: ${value}`);
        }
      }
      for (const value of globals.dataAttributes) {
        if (!value.startsWith("data-discern-")) {
          violations.push(`${path}: ${value}`);
        }
      }
      for (const value of globals.keyframes) {
        if (!value.startsWith("discern-")) {
          violations.push(`${path}: @keyframes ${value}`);
        }
      }
    }
    assertEquals(violations, []);
    const output = await Deno.readTextFile(join(temp, "discern.css"));
    assertMatch(
      output,
      /@layer discern\.tokens \{\s*:where\(\[data-discern-root\]\)/,
    );
    assert(!output.includes("\n  :root {"));
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("selection resolves dependencies and excludes unrelated groups", async () => {
  const temp = await Deno.makeTempDir();
  try {
    const summary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      components: ["dialog"],
    });
    assertEquals(summary.manifest.selection.resolvedComponents, [
      "kicker",
      "dialog",
    ]);
    const css = await Deno.readTextFile(join(temp, "discern.css"));
    assertStringIncludes(css, ".discern-kicker");
    assertStringIncludes(css, ".discern-dialog");
    assert(!css.includes(".discern-hero-block"));
    assert(!css.includes(".discern-prose"));

    const docs = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      components: ["icon", "icon-button", "kicker", "window"],
    });
    assertEquals(docs.manifest.selection.resolvedComponents, [
      "icon",
      "icon-button",
      "kicker",
      "window",
    ]);
    assertEquals(docs.manifest.selection.requestedGroups, []);
    assertEquals(await outputPaths(temp), ["discern.css", "manifest.json"]);
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("all selection and repeated emission are byte-for-byte deterministic", async () => {
  const first = await Deno.makeTempDir();
  const second = await Deno.makeTempDir();
  try {
    const options = {
      all: true,
      assets: ["fonts", "grain"] as const,
    };
    const firstSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${first}/`),
      ...options,
    });
    const secondSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${second}/`),
      ...options,
    });
    assertEquals(firstSummary.components, packageManifest.components.length);
    assertEquals(firstSummary.manifest, secondSummary.manifest);
    const paths = await outputPaths(first);
    assertEquals(paths, await outputPaths(second));
    for (const path of paths) {
      assertEquals(
        await Deno.readFile(join(first, path)),
        await Deno.readFile(join(second, path)),
        path,
      );
    }
  } finally {
    await Deno.remove(first, { recursive: true });
    await Deno.remove(second, { recursive: true });
  }
});

Deno.test("font and grain assets are independent, licensed, and integrity-mapped", async () => {
  const fonts = await Deno.makeTempDir();
  const grain = await Deno.makeTempDir();
  try {
    const fontSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${fonts}/`),
      components: ["button"],
      assets: ["fonts"],
    });
    const fontPaths = await outputPaths(fonts);
    assert(fontPaths.includes("fonts.css"));
    assert(fontPaths.some((path) => path.startsWith("fonts/")));
    assert(fontPaths.some((path) => path.startsWith("licenses/")));
    assert(!fontPaths.includes("grain.css"));
    assert(!fontPaths.some((path) => path.startsWith("textures/")));
    for (
      const path of fontPaths.filter((candidate) =>
        candidate.endsWith(".woff2")
      )
    ) {
      const bytes = await Deno.readFile(join(fonts, path));
      assertEquals(new TextDecoder().decode(bytes.slice(0, 4)), "wOF2", path);
    }
    for (
      const path of fontPaths.filter((candidate) => candidate.endsWith(".txt"))
    ) {
      assertStringIncludes(
        await Deno.readTextFile(join(fonts, path)),
        "SIL OPEN FONT LICENSE",
      );
    }

    const grainSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${grain}/`),
      components: ["button"],
      assets: ["grain"],
    });
    assertEquals(await outputPaths(grain), [
      "discern.css",
      "grain.css",
      "manifest.json",
      "textures/grain.png",
    ]);
    const core = await Deno.readTextFile(join(grain, "discern.css"));
    assert(!core.includes('url("./textures/grain.png")'));
    assertStringIncludes(
      await Deno.readTextFile(join(grain, "grain.css")),
      'url("./textures/grain.png")',
    );

    for (const summary of [fontSummary, grainSummary]) {
      assertEquals(summary.manifest.schemaVersion, 1);
      assert(!JSON.stringify(summary.manifest).includes('"description"'));
      for (const file of summary.manifest.integrity.files) {
        const root = summary === fontSummary ? fonts : grain;
        assertEquals(
          file.integrity,
          `sha256:${await sha256(await Deno.readFile(join(root, file.path)))}`,
        );
      }
    }
  } finally {
    await Deno.remove(fonts, { recursive: true });
    await Deno.remove(grain, { recursive: true });
  }
});

Deno.test("default blue and green themes share component CSS and preserve state semantics", async () => {
  const fixture = await Deno.readTextFile(
    join(PACKAGE_ROOT, "tests", "fixtures", "green-theme.css"),
  );
  assertEquals([...publicCssGlobals(fixture).classes], []);
  for (const declaration of fixture.matchAll(/(--[\w-]+):/g)) {
    assert((declaration[1] ?? "").startsWith("--discern-"));
  }
  const overrides = fixtureOverrides(fixture);
  for (const mode of ["light", "dark"] as const) {
    const pairs = [
      ["--discern-color-ink", "--discern-color-canvas"],
      ["--discern-color-ink-muted", "--discern-color-canvas"],
      ["--discern-color-ink-faint", "--discern-color-canvas"],
      ["--discern-color-ink-faint", "--discern-color-surface"],
      ["--discern-color-ink-faint", "--discern-color-surface-sunken"],
      ["--discern-color-ink-faint", "--discern-color-accent-100"],
      ["--discern-color-accent-700", "--discern-color-accent-100"],
      ["--discern-color-accent-800", "--discern-color-accent-100"],
      ["--discern-color-success-deep", "--discern-color-success-soft"],
      ["--discern-color-warning-deep", "--discern-color-warning-soft"],
    ] as const;
    for (const [foreground, background] of pairs) {
      assert(
        contrast(
          themeValue(foreground, mode, overrides),
          themeValue(background, mode, overrides),
        ) >= 4.5,
        `${mode} ${foreground} on ${background} lacks text contrast`,
      );
    }
    const states = [
      parseOklch(themeValue("--discern-color-accent-600", mode, overrides)),
      parseOklch(themeValue("--discern-color-success", mode, overrides)),
      parseOklch(themeValue("--discern-color-warning", mode, overrides)),
      parseOklch(themeValue("--discern-color-danger", mode, overrides)),
    ];
    for (let first = 0; first < states.length; first++) {
      for (let second = first + 1; second < states.length; second++) {
        const left = states[first];
        const right = states[second];
        assert(left !== undefined && right !== undefined);
        assert(
          distance(left, right) >= 0.08,
          `${mode} states ${first}/${second}`,
        );
      }
    }
  }

  const foundation = await Deno.readTextFile(
    join(PACKAGE_ROOT, "src", "styles", "foundation.css"),
  );
  assertStringIncludes(foundation, "@media (prefers-reduced-motion: reduce)");
  assertStringIncludes(foundation, "@media (forced-colors: active)");
  assertStringIncludes(foundation, ":focus-visible");
  assertStringIncludes(foundation, "CanvasText");
});

Deno.test("catalogue chrome cannot leak descendant styles into component examples", async () => {
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "styleguide", "styleguide.css"),
  );
  const selectors = [...source.matchAll(/([^{}]+)\{/g)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map((selector) => selector.trim())
    .filter((selector) => !selector.startsWith("@"));
  assertEquals(
    selectors.filter((selector) =>
      /\.discern-catalogue-component\s+(?!>)/.test(selector)
    ),
    [],
  );
});

Deno.test("neutral entrypoints work in an external cached-only Deno project", async () => {
  const temp = await Deno.makeTempDir();
  try {
    const packageImports = {
      "@discern-sh/design-system":
        new URL("../src/mod.ts", import.meta.url).href,
      "@discern-sh/design-system/manifest": new URL(
        "../src/manifest.ts",
        import.meta.url,
      ).href,
      "@discern-sh/design-system/react":
        new URL("../src/react.ts", import.meta.url)
          .href,
      "@discern-sh/design-system/runtime": new URL(
        "../src/runtime.ts",
        import.meta.url,
      ).href,
      "@discern-sh/design-system/theme/discern": new URL(
        "../src/theme/discern.ts",
        import.meta.url,
      ).href,
      "@discern-sh/design-system/tokens": new URL(
        "../src/tokens/tokens.ts",
        import.meta.url,
      ).href,
    };
    await Deno.writeTextFile(
      join(temp, "deno.json"),
      JSON.stringify(
        {
          nodeModulesDir: "none",
          imports: packageImports,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(
      join(temp, "neutral.ts"),
      `import { packageManifest, semanticClass } from "@discern-sh/design-system";
import { emitDesignSystemRuntime } from "@discern-sh/design-system/runtime";
import { discernTheme } from "@discern-sh/design-system/theme/discern";
const result = await emitDesignSystemRuntime({
  outputRoot: new URL("./runtime/", import.meta.url),
  components: ["button"],
});
console.log(JSON.stringify({
  className: semanticClass("button"),
  components: result.components,
  package: packageManifest.package,
  theme: discernTheme.name,
}));
`,
    );
    const first = await command(temp, [
      "run",
      "--allow-read",
      "--allow-write",
      "neutral.ts",
    ]);
    assertStringIncludes(first, '"className":"discern-button"');
    const cached = await command(temp, [
      "run",
      "--cached-only",
      "--allow-read",
      "--allow-write",
      "neutral.ts",
    ]);
    assertEquals(cached, first);
    const graph = await command(temp, ["info", "--json", "neutral.ts"]);
    assert(!graph.includes("npm:react"), "neutral graph resolved React");
    assert(
      !graph.includes("/src/react.ts"),
      "neutral graph reached the adapter",
    );

    await Deno.writeTextFile(
      join(temp, "deno.json"),
      JSON.stringify(
        {
          nodeModulesDir: "none",
          compilerOptions: { jsx: "react-jsx", jsxImportSource: "react" },
          imports: {
            ...packageImports,
            "react": "npm:react@18.3.1",
            "react/jsx-runtime": "npm:react@18.3.1/jsx-runtime",
            "react-dom/server": "npm:react-dom@18.3.1/server",
          },
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(
      join(temp, "react-consumer.ts"),
      `import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@discern-sh/design-system/react";
console.log(renderToStaticMarkup(createElement(Button, null, "Continue")));
`,
    );
    const rendered = await command(temp, [
      "run",
      "--allow-env=NODE_ENV",
      "react-consumer.ts",
    ]);
    const cachedRendered = await command(temp, [
      "run",
      "--cached-only",
      "--allow-env=NODE_ENV",
      "react-consumer.ts",
    ]);
    assertStringIncludes(rendered, 'class="discern-button ');
    assert(!rendered.includes("react"));
    assertEquals(cachedRendered, rendered);
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("semantic HTML and React adapters share the public class contract", () => {
  assertEquals(semanticClass("button"), "discern-button");
  assertEquals(
    semanticClass("button", { element: "icon", modifier: "trailing" }),
    "discern-button__icon--trailing",
  );
  const html = renderToStaticMarkup(
    createElement(Button, { variant: "secondary", children: "Continue" }),
  );
  assertStringIncludes(
    html,
    'class="discern-button discern-button--secondary discern-button--md"',
  );
  assertMatch(html, /^<button/);

  const breadcrumbs = renderToStaticMarkup(
    createElement(Breadcrumbs, {
      label: "Page trail",
      items: [{ label: "Library", href: "/library" }],
      current: "Navigation",
    }),
  );
  assertMatch(breadcrumbs, /^<nav/);
  assertStringIncludes(breadcrumbs, 'aria-label="Page trail"');
  assertStringIncludes(breadcrumbs, '<a href="/library">Library</a>');
  assertStringIncludes(breadcrumbs, 'aria-hidden="true">/</span>');
  assertStringIncludes(breadcrumbs, 'aria-current="page">Navigation</span>');
});

Deno.test("every custom property the emitted css references is defined by the emission", async () => {
  const temp = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      all: true,
      assets: ["fonts", "grain"],
    });
    const css = await Deno.readTextFile(join(temp, "discern.css"));
    const defined = new Set(
      [...css.matchAll(/(--discern-[a-z0-9-]+)\s*:/g)].map((match) =>
        match[1] ?? ""
      ),
    );
    // A reference carrying a fallback is a deliberate consumer knob (the
    // layout gap properties); a bare reference must resolve to a definition.
    const referenced = new Set(
      [...css.matchAll(/var\(\s*(--discern-[a-z0-9-]+)\s*([,)])/g)]
        .filter((match) => match[2] === ")")
        .map((match) => match[1] ?? ""),
    );
    const unresolved = [...referenced].filter((name) => !defined.has(name))
      .toSorted();
    assertEquals(
      unresolved,
      [],
      "component css references custom properties no token, theme, or foundation defines",
    );
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("avatar and agent avatar resolve every size step from the shared scale tokens", async () => {
  const prefix = "--discern-avatar-size-";
  const steps = baseTokens
    .filter((token) => token.name.startsWith(prefix))
    .map((token) => token.name.slice(prefix.length));
  assert(steps.length >= 5, "the avatar size scale lost its token steps");
  for (
    const stylesheet of [
      join(COMPONENT_ROOT, "people", "avatar", "avatar.css"),
      join(COMPONENT_ROOT, "agents", "agent-avatar", "agent-avatar.css"),
    ]
  ) {
    const css = await Deno.readTextFile(stylesheet);
    for (const step of steps) {
      assertStringIncludes(
        css,
        `var(${prefix}${step})`,
        `${stylesheet} is missing the ${step} scale step`,
      );
    }
    for (
      const declaration of css.matchAll(/--discern-avatar-size:\s*([^;]+);/g)
    ) {
      const value = (declaration[1] ?? "").trim();
      const reference = value.match(/^var\(--discern-avatar-size-([a-z]+)\)$/);
      const step = reference?.[1];
      assert(
        step !== undefined && steps.includes(step),
        `${stylesheet} pins --discern-avatar-size to "${value}" instead of a shared scale token`,
      );
    }
  }
});

function accessibleText(html: string): string {
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
  ]);
  const openedHidden: boolean[] = [];
  let hiddenDepth = 0;
  let text = "";
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith("</")) {
      if (openedHidden.pop() === true) hiddenDepth--;
    } else if (part.startsWith("<")) {
      const tag = (part.match(/^<([a-zA-Z0-9-]+)/)?.[1] ?? "").toLowerCase();
      const hidden = part.includes('aria-hidden="true"');
      const label = part.match(/aria-label="([^"]*)"/)?.[1];
      if (!hidden && hiddenDepth === 0 && label !== undefined) {
        text += ` ${label} `;
      }
      if (!part.endsWith("/>") && !voidTags.has(tag)) {
        openedHidden.push(hidden);
        if (hidden) hiddenDepth++;
      }
    } else if (hiddenDepth === 0) {
      text += part;
    }
  }
  return text;
}

Deno.test("every stateful marker joins the accessible text in its example", async () => {
  const exampleFiles = (await walk(COMPONENT_ROOT))
    .filter((path) => path.endsWith(".examples.tsx"));
  assert(exampleFiles.length > 0);
  const statePattern = /data-discern-(?:status|state|presence)="([^"]+)"/g;
  let statefulExamples = 0;
  for (const path of exampleFiles) {
    const module = await import(toFileUrl(path).href) as {
      default: Parameters<typeof createElement>[0];
    };
    const html = renderToStaticMarkup(createElement(module.default));
    const states = new Set(
      [...html.matchAll(statePattern)].map((match) => match[1] ?? ""),
    );
    if (states.size === 0) continue;
    statefulExamples++;
    const spoken = accessibleText(html).toLowerCase();
    for (const state of states) {
      assert(
        spoken.includes(state.toLowerCase()),
        `${
          relative(PACKAGE_ROOT, path)
        } renders state "${state}" without speaking it: the state word (or a label carrying it) must appear outside aria-hidden subtrees`,
      );
    }
  }
  assert(statefulExamples > 0, "no stateful example enrolled in the guard");
});
