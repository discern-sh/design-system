import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join, relative, toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cssAtRuleBlocks } from "../scripts/css-syntax.ts";
import {
  auditBundledFontMetricAssets,
  auditFontMetricOverrides,
  bundledFontMetricSources,
} from "../scripts/font-metric-overrides.ts";
import { generateSources } from "../scripts/generate.ts";
import {
  packageManifest,
  RUNTIME_MANIFEST_SCHEMA_VERSION,
} from "../src/manifest.ts";
import {
  Brand,
  Breadcrumbs,
  Button,
  DestructiveActionNotice,
  Diagnostic,
  type DiagnosticProps,
  GlossaryTerm,
  HoverCard,
  Logo,
  Procedure,
  RawOutput,
  RetryNotice,
  SiteHeader,
  ThemeSwitcher,
  Tooltip,
} from "../src/react.ts";
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

function focusSurfaceFailures(
  focus: string,
  surfaces: readonly {
    readonly name: string;
    readonly color: string;
  }[],
): readonly string[] {
  return surfaces.filter(({ color }) => contrast(focus, color) < 3).map((
    { name },
  ) => name);
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
      join(PACKAGE_ROOT, "src", "generated", "behaviors.ts"),
    ),
    generated.behaviors,
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
    assertStringIncludes(output, "color-scheme: light dark;");
    assertStringIncludes(output, "\n  @media (prefers-color-scheme: dark)");
    const systemDark = output.slice(
      output.indexOf("@media (prefers-color-scheme: dark)"),
    );
    assertStringIncludes(
      systemDark,
      ':where([data-discern-root][data-discern-theme="system"])',
    );
    for (const token of themeTokens) {
      assertStringIncludes(
        systemDark,
        `${token.name}: ${token.dark};`,
      );
    }
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

    const branding = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      components: ["brand"],
    });
    assertEquals(branding.manifest.selection.resolvedComponents, [
      "logo",
      "brand",
    ]);

    const glossary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${temp}/`),
      components: ["glossary-term"],
    });
    assertEquals(glossary.manifest.selection.resolvedComponents, [
      "hover-card",
      "glossary-term",
    ]);
    const glossaryCss = await Deno.readTextFile(join(temp, "discern.css"));
    assertStringIncludes(glossaryCss, ".discern-hover-card");
    assertStringIncludes(glossaryCss, ".discern-glossary-term");
    assert(!glossaryCss.includes(".discern-brand"));
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
});

Deno.test("floating supplementary surfaces auto-enrol shared browser behavior", async () => {
  const floatingComponents = packageManifest.components.filter(({ id }) =>
    id === "hover-card" || id === "tooltip"
  );
  assertEquals(
    floatingComponents.map((component) => ({
      id: component.id,
      behaviors: component.behaviors,
    })),
    [
      { id: "tooltip", behaviors: ["floating-surface"] },
      { id: "hover-card", behaviors: ["floating-surface"] },
    ],
  );

  const hoverCard = renderToStaticMarkup(
    createElement(HoverCard, {
      label: "Record details",
      trigger: createElement(
        "button",
        { "aria-details": "existing-details" },
        "Inspect",
      ),
      children: "Supplementary detail",
    }),
  );
  const tooltip = renderToStaticMarkup(
    createElement(Tooltip, {
      label: "Supplementary label",
      children: createElement(
        "button",
        { "aria-describedby": "existing-description" },
        "Inspect",
      ),
    }),
  );
  for (const markup of [hoverCard, tooltip]) {
    assertStringIncludes(markup, "data-discern-floating-root");
    assertStringIncludes(markup, "data-discern-floating-trigger");
    assertStringIncludes(markup, "data-discern-floating-panel");
  }

  const floating = await Deno.makeTempDir();
  const staticOnly = await Deno.makeTempDir();
  try {
    const summary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${floating}/`),
      components: ["hover-card"],
    });
    assertEquals(summary.manifest.outputs.scripts, ["discern.js"]);
    assertEquals(await outputPaths(floating), [
      "discern.css",
      "discern.js",
      "manifest.json",
    ]);
    const behavior = await Deno.readTextFile(join(floating, "discern.js"));
    assertStringIncludes(behavior, "[data-discern-floating-root]");
    assertStringIncludes(behavior, "showPopover");

    const staticSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${staticOnly}/`),
      components: ["button"],
    });
    assertEquals(staticSummary.manifest.outputs.scripts, []);
    assertEquals(await outputPaths(staticOnly), [
      "discern.css",
      "manifest.json",
    ]);
  } finally {
    await Deno.remove(floating, { recursive: true });
    await Deno.remove(staticOnly, { recursive: true });
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
    const fontCss = await Deno.readTextFile(join(fonts, "fonts.css"));
    for (
      const fragment of [
        '--discern-font-display: "Crimson Pro", "Discern Crimson Fallback Iowan",',
        '"Discern Crimson Fallback Georgia", "Iowan Old Style", Georgia, serif;',
        '--discern-font-body: "Inter", "Discern Inter Fallback Helvetica",',
        '"Discern Inter Fallback Arial", "Helvetica Neue", Arial, system-ui,',
        '--discern-font-ui: "Inter", "Discern Inter Fallback Helvetica",',
        '--discern-font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo,',
      ]
    ) {
      assertStringIncludes(fontCss, fragment);
    }
    const metricAudit = auditFontMetricOverrides(fontCss);
    assert(metricAudit.faces > 0, "no metric-adjusted font faces enrolled");
    assertEquals(metricAudit.failures, []);
    assertEquals(
      [
        ...new Set(
          metricAudit.browserCases.map(({ fallback }) =>
            fallback.replaceAll('"', "")
          ),
        ),
      ].toSorted(),
      metricAudit.aliases,
    );
    const metricAssets = await Promise.all(
      bundledFontMetricSources().map(async (source) => ({
        source,
        bytes: await Deno.readFile(join(fonts, source)),
      })),
    );
    assertEquals(await auditBundledFontMetricAssets(metricAssets), []);
    const firstMetricAsset = metricAssets[0];
    assert(firstMetricAsset !== undefined);
    const changedBytes = new Uint8Array(firstMetricAsset.bytes);
    const changedIndex = Math.floor(changedBytes.length / 2);
    changedBytes[changedIndex] = (changedBytes[changedIndex] ?? 0) ^ 1;
    const changedAssets = metricAssets.map((asset) =>
      asset === firstMetricAsset ? { ...asset, bytes: changedBytes } : asset
    );
    const changedFailures = await auditBundledFontMetricAssets(changedAssets);
    assertEquals(changedFailures.length, 1);
    assertStringIncludes(changedFailures[0] ?? "", firstMetricAsset.source);
    assertStringIncludes(changedFailures[0] ?? "", "re-measure the font");
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
      assertEquals(
        summary.manifest.schemaVersion,
        RUNTIME_MANIFEST_SCHEMA_VERSION,
      );
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

Deno.test("target font metrics authorize the exact live face population", async () => {
  const fontCss = await Deno.readTextFile(
    new URL("../assets/fonts.css", import.meta.url),
  );
  const futureSource = "./fonts/crimson-pro-future.woff2";
  const futureFace = auditFontMetricOverrides(`${fontCss}
@font-face {
  font-family: "Crimson Pro";
  font-style: normal;
  font-weight: 200 900;
  font-display: swap;
  src: url("${futureSource}") format("woff2");
}
`);
  assertEquals(futureFace.failures.length, 1);
  assertStringIncludes(futureFace.failures[0] ?? "", futureSource);
  assertStringIncludes(
    futureFace.failures[0] ?? "",
    "no exact metric authority",
  );
  assert(!bundledFontMetricSources().includes(futureSource));

  for (
    const [family, source] of [
      ['"crimson pro"', "./fonts/crimson-pro-lowercase.woff2"],
      ["Crimson/**/ Pro", "./fonts/crimson-pro-unquoted.woff2"],
    ] as const
  ) {
    const normalizedFamily = auditFontMetricOverrides(`${fontCss}
@font-face {
  font-family: ${family};
  font-style: normal;
  font-weight: 200 900;
  src: url("${source}") format("woff2");
}
`);
    assertStringIncludes(normalizedFamily.failures.join("\n"), source);
    assertStringIncludes(
      normalizedFamily.failures.join("\n"),
      "no exact metric authority",
    );
  }

  for (const family of ['"Crimson  Pro"', '" Crimson Pro"']) {
    const distinctQuotedFamily = auditFontMetricOverrides(
      fontCss.replace(
        'font-family: "Crimson Pro";',
        `font-family: ${family};`,
      ),
    );
    assertStringIncludes(
      distinctQuotedFamily.failures.join("\n"),
      "target metric authority has no live normal 200–900 face",
      `${family} collapsed into the Crimson Pro authority`,
    );
  }

  for (
    const equivalentFamily of [
      '"crimson pro"',
      "Crimson/**/\n\t Pro",
    ]
  ) {
    assertEquals(
      auditFontMetricOverrides(
        fontCss.replace(
          'font-family: "Crimson Pro";',
          `font-family: ${equivalentFamily};`,
        ),
      ).failures,
      [],
      `${equivalentFamily} did not preserve the Crimson Pro identity`,
    );
  }

  const romanSource = "./fonts/crimson-pro-roman.woff2";
  const confusedSource = `${romanSource}-next`;
  const confused = auditFontMetricOverrides(
    fontCss.replace(romanSource, confusedSource),
  );
  assertEquals(confused.failures.length, 2);
  const confusedEvidence = confused.failures.join("\n");
  assertStringIncludes(confusedEvidence, confusedSource);
  assertStringIncludes(confusedEvidence, romanSource);
  assertStringIncludes(confusedEvidence, "no live normal 200–900 face");

  const locallyShadowed = auditFontMetricOverrides(
    fontCss.replace(
      `src: url("${romanSource}")`,
      `src: local("Crimson Pro"), url("${romanSource}")`,
    ),
  );
  assertEquals(locallyShadowed.failures.length, 1);
  assertStringIncludes(
    locallyShadowed.failures[0] ?? "",
    'local("Crimson Pro") has no exact metric authority',
  );

  for (
    const mutation of [
      {
        descriptor: "src",
        css: fontCss.replace(
          `src: url("${romanSource}")`,
          `src: url("${romanSource}"); src: url("${futureSource}")`,
        ),
      },
      {
        descriptor: "font-family",
        css: fontCss.replace(
          `font-family: "Crimson Pro";`,
          `font-family: "Crimson Pro"; font-family: "Future Family";`,
        ),
      },
      {
        descriptor: "font-style",
        css: fontCss.replace(
          `font-style: normal;`,
          `font-style: normal; font-style: italic;`,
        ),
      },
      {
        descriptor: "font-weight",
        css: fontCss.replace(
          `font-weight: 200 900;`,
          `font-weight: 200 900; font-weight: 400;`,
        ),
      },
    ]
  ) {
    assertStringIncludes(
      auditFontMetricOverrides(mutation.css).failures.join("\n"),
      `duplicate ${mutation.descriptor}`,
    );
  }

  for (
    const [descriptor, value] of [
      [
        "src",
        `url("${romanSource}") format("woff2"),`,
      ],
      [
        "src",
        `url("${romanSource}")) format("woff2")`,
      ],
      [
        "src",
        `url("${romanSource}") format("woff2") garbage`,
      ],
      [
        "src",
        `url("${romanSource}") tech("variations") format("woff2")`,
      ],
      [
        "src",
        `url("${romanSource}") format("woff2") tech("variations")`,
      ],
      [
        "src",
        `format("woff2") url("${romanSource}")`,
      ],
      [
        "src",
        `url("${romanSource}")`,
      ],
      [
        "src",
        `url("${romanSource}") format(woff2,)`,
      ],
      ["font-weight", "200 900 garbage"],
    ] as const
  ) {
    const invalid = auditFontMetricOverrides(
      fontCss.replace(
        descriptor === "src"
          ? `url("${romanSource}") format("woff2")`
          : "font-weight: 200 900",
        descriptor === "src" ? value : `font-weight: ${value}`,
      ),
    );
    assertStringIncludes(
      invalid.failures.join("\n"),
      `invalid ${descriptor} descriptor`,
    );
  }

  const balanced = auditFontMetricOverrides(
    fontCss.replace(
      `url("${romanSource}") format("woff2")`,
      `url(/**/"${romanSource}"/**/) /**/ format(/**/"woff2"/**/)`,
    ),
  );
  assertEquals(balanced.failures, []);

  const identifierFormat = auditFontMetricOverrides(
    fontCss.replace(
      `url("${romanSource}") format("woff2")`,
      `url("${romanSource}") format(woff2)`,
    ),
  );
  assertEquals(identifierFormat.failures, []);

  const wrongFormat = auditFontMetricOverrides(
    fontCss.replace(
      `url("${romanSource}") format("woff2")`,
      `url("${romanSource}") format("woff")`,
    ),
  );
  assertStringIncludes(
    wrongFormat.failures.join("\n"),
    "has no exact metric authority",
  );

  const ruleContexts = cssAtRuleBlocks(
    `@font-face { font-family: "Top"; }
.future-surface { @font-face { font-family: "Nested"; } }
@media (min-width: 1px) { @font-face { font-family: "Conditional"; } }`,
    "font-face",
  );
  assertEquals(
    ruleContexts.blocks.map(({ depth, parent }) => ({ depth, parent })),
    [
      { depth: 0, parent: "stylesheet" },
      { depth: 1, parent: "qualified-rule" },
      { depth: 1, parent: "at-rule" },
    ],
  );

  const nestedAuthority = auditFontMetricOverrides(
    `.future-surface {\n${fontCss}\n}`,
  );
  assertStringIncludes(
    nestedAuthority.failures.join("\n"),
    "target metric authority has no live normal 200–900 face",
  );

  for (
    const variant of [
      {
        source: "./fonts/crimson-pro-uppercase.woff2",
        face: `@FONT-FACE/**/ {
  FONT-FAMILY/**/:/**/"Crimson Pro";
  FONT-STYLE:/**/normal;
  FONT-WEIGHT:/**/200/**/900;
  SRC/**/:/**/url("./fonts/crimson-pro-uppercase.woff2") format("woff2");
}`,
      },
      {
        source: "./fonts/crimson-pro-escaped-family.woff2",
        face: `@font-face {
  font-family: "Crimson\\20 Pro";
  font-style: normal;
  font-weight: 200 900;
  src: url("./fonts/crimson-pro-escaped-family.woff2") format("woff2");
}`,
      },
      {
        source: "./fonts/crimson-pro-escaped-keywords.woff2",
        face: `@f\\6f nt-face {
  f\\6f nt-family: "Crimson Pro";
  font-style: normal;
  font-weight: 200 900;
  src: url("./fonts/crimson-pro-escaped-keywords.woff2") format("woff2");
}`,
      },
      {
        source: "./fonts/crimson-pro-/**/-literal.woff2",
        face: `@font-face {
  font-family: "Crimson Pro";
  font-style: normal;
  font-weight: 200 900;
  src: url("./fonts/crimson-pro-/**/-literal.woff2") format("woff2");
}`,
      },
      {
        source: "./fonts/crimson-pro-)/**/-literal.woff2",
        face: `@font-face {
  font-family: "Crimson Pro";
  font-style: normal;
  font-weight: 200 900;
  src: url("./fonts/crimson-pro-)/**/-literal.woff2") format("woff2");
}`,
      },
    ]
  ) {
    const evidence = auditFontMetricOverrides(
      `${fontCss}\n${variant.face}`,
    ).failures.join("\n");
    assertStringIncludes(evidence, variant.source);
    assertStringIncludes(evidence, "no exact metric authority");
  }
});

Deno.test("font metric audit enrolls future aliases and rejects malformed faces", async () => {
  const fontCss = await Deno.readTextFile(
    new URL("../assets/fonts.css", import.meta.url),
  );
  const futureAlias = "Discern Crimson Fallback Future";
  const valid = auditFontMetricOverrides(`${fontCss}
@font-face {
  font-family: "${futureAlias}";
  font-style: normal;
  font-weight: 200 900;
  src: local("Future Serif");
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 21%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${futureAlias}";
  font-style: italic;
  font-weight: 200 900;
  src: local("Future Serif Italic");
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 21%;
  line-gap-override: 0%;
}
:where([data-discern-root]) {
  --discern-font-future: "Crimson Pro", "${futureAlias}", serif;
}
`);
  assertEquals(valid.failures, []);
  assert(valid.aliases.includes(futureAlias));
  assertEquals(
    valid.browserCases.filter(({ fallback }) => fallback.includes(futureAlias))
      .map(({ style, weights }) => ({ style, weights })),
    [
      { style: "italic", weights: [400, 700] },
      { style: "normal", weights: [400, 700] },
    ],
  );

  const malformed = auditFontMetricOverrides(`${fontCss}
@font-face {
  font-family: "${futureAlias}";
  font-style: normal;
  font-weight: 200 400;
  src: local("Future Serif");
  size-adjust: 100%;
  ascent-override: 50%;
  descent-override: 50%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${futureAlias}";
  font-style: normal;
  font-weight: 200 400;
  src: local("Future Serif Duplicate");
  size-adjust: 100%;
  ascent-override: 50%;
  descent-override: 50%;
  line-gap-override: 0%;
}
:where([data-discern-root]) {
  --discern-font-future: "Crimson Pro", "${futureAlias}", serif;
}
`);
  assert(
    malformed.aliases.includes(futureAlias),
    "the future alias did not enroll from its font-role stack",
  );
  const evidence = malformed.failures.join("\n");
  for (
    const expected of [
      "effective ascent",
      "effective descent",
      "overlapping or duplicate",
      "do not cover",
      "missing an italic face",
    ]
  ) {
    assertStringIncludes(evidence, expected);
  }
});

Deno.test("default blue and green themes share component CSS and preserve state semantics", async () => {
  const fixture = await Deno.readTextFile(
    join(PACKAGE_ROOT, "tests", "fixtures", "green-theme.css"),
  );
  assertEquals([...publicCssGlobals(fixture).classes], []);
  assertStringIncludes(fixture, "@media (prefers-color-scheme: dark)");
  assertStringIncludes(
    fixture,
    ':where([data-discern-root][data-discern-theme="system"])',
  );
  for (const declaration of fixture.matchAll(/(--[\w-]+):/g)) {
    assert((declaration[1] ?? "").startsWith("--discern-"));
  }
  const overrides = fixtureOverrides(fixture);
  const semanticFocusSurfaces = themeTokens.filter(({ name }) =>
    name === "--discern-color-accent-100" || name.endsWith("-soft")
  );
  assertEquals(semanticFocusSurfaces.length, 4);
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
    assertEquals(
      focusSurfaceFailures(
        themeValue("--discern-color-accent-500", mode, overrides),
        semanticFocusSurfaces.map(({ name }) => ({
          name,
          color: themeValue(name, mode, overrides),
        })),
      ),
      [],
      `${mode} focus indicator lacks 3:1 contrast on a semantic surface`,
    );
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
  assertEquals(
    focusSurfaceFailures("#fff", [{
      name: "--discern-color-future-soft",
      color: "#fff",
    }]),
    ["--discern-color-future-soft"],
    "a future semantic surface escaped focus-contrast detection",
  );

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

  const themeSwitcher = renderToStaticMarkup(
    createElement(ThemeSwitcher, { onModeChange: () => undefined }),
  );
  assertMatch(themeSwitcher, /^<fieldset/);
  assertStringIncludes(themeSwitcher, 'data-discern-mode="system"');
  assertEquals((themeSwitcher.match(/type="radio"/g) ?? []).length, 3);
  assertMatch(
    themeSwitcher,
    /<input(?=[^>]*value="system")(?=[^>]*checked="")[^>]*>/,
  );
});

type IsRequired<T, Key extends keyof T> = Partial<Record<Key, never>> extends
  Pick<
    T,
    Key
  > ? false
  : true;

Deno.test("diagnostics require a correction and derive their default role from severity", () => {
  const correctionIsRequired: IsRequired<DiagnosticProps, "correction"> = true;
  assert(correctionIsRequired);

  const failure = renderToStaticMarkup(
    createElement(Diagnostic, {
      title: "Type check failed",
      impact: "The package cannot be built.",
      correction: "Handle the missing case, then retry.",
    }),
  );
  assertMatch(failure, /^<article role="alert"/);
  assertStringIncludes(failure, 'data-discern-state="failure">Failure');
  assertStringIncludes(failure, "Suggested correction");
  assertStringIncludes(failure, "Handle the missing case, then retry.");

  const attention = renderToStaticMarkup(
    createElement(Diagnostic, {
      severity: "attention",
      title: "Generated output is stale",
      impact: "The derived surface may be out of date.",
      correction: "Regenerate the derived files.",
    }),
  );
  assertMatch(attention, /^<article role="status"/);
  assertStringIncludes(attention, 'data-discern-state="attention">Attention');

  const explicitRole = renderToStaticMarkup(
    createElement(Diagnostic, {
      role: "note",
      title: "Recorded failure",
      impact: "The failure needs review.",
      correction: "Review the recorded evidence.",
    }),
  );
  assertMatch(explicitRole, /^<article role="note"/);
});

Deno.test("branding and hover-card adapters preserve their semantic relationships", () => {
  const logo = renderToStaticMarkup(
    createElement(Logo, { label: "Field notes", children: "FN" }),
  );
  assertStringIncludes(logo, 'role="img"');
  assertStringIncludes(logo, 'aria-label="Field notes"');
  assertStringIncludes(logo, "discern-logo--plain");
  assertStringIncludes(logo, "discern-logo--natural");

  const brand = renderToStaticMarkup(
    createElement(Brand, {
      name: "discern",
      mark: "◮",
      typeface: "mono",
    }),
  );
  assertStringIncludes(brand, "discern-brand--mono");
  assertStringIncludes(brand, 'aria-hidden="true">◮</span>');
  assert(!brand.includes('role="img"'));

  const header = renderToStaticMarkup(
    createElement(SiteHeader, {
      brand: "discern",
      brandMark: "◮",
      brandTypeface: "mono",
      brandMarkTreatment: "plain",
    }),
  );
  assertStringIncludes(header, "discern-site-header__brand--mono");
  assertStringIncludes(header, "discern-site-header__mark--plain");
  assertStringIncludes(header, "discern-site-header__mark--natural");

  const hoverCard = renderToStaticMarkup(
    createElement(HoverCard, {
      layout: "block",
      label: "Record details",
      align: "start",
      trigger: createElement(
        "button",
        { "aria-details": "existing" },
        "Inspect",
      ),
      children: createElement("p", null, "Flexible content"),
    }),
  );
  assertMatch(hoverCard, /^<div/);
  assertMatch(hoverCard, /aria-details="existing [^"]+"/);
  assertMatch(
    hoverCard,
    /id="([^"]+)" role="group" aria-label="Record details"/,
  );

  const glossaryTerm = renderToStaticMarkup(
    createElement(GlossaryTerm, {
      definition: "A separate checkout for one line of work.",
      children: "Worktree",
    }),
  );
  assertStringIncludes(glossaryTerm, "<dfn");
  assertStringIncludes(glossaryTerm, 'tabindex="0"');
  assertStringIncludes(glossaryTerm, "discern-dotted-underline");
  assertMatch(glossaryTerm, /aria-details="[^"]+"/);
  assertStringIncludes(
    glossaryTerm,
    'role="group" aria-label="Worktree definition"',
  );
});

Deno.test("brand-bearing page chrome keeps plain, tiled, mono, and adaptive mark variants", async () => {
  for (
    const stylesheet of [
      join(COMPONENT_ROOT, "marketing", "site-header", "site-header.css"),
      join(COMPONENT_ROOT, "marketing", "site-footer", "site-footer.css"),
    ]
  ) {
    const css = await Deno.readTextFile(stylesheet);
    for (
      const variant of [
        "__brand--mono",
        "__mark--plain",
        "__mark--tile",
        "__mark--square",
      ]
    ) {
      assertStringIncludes(
        css,
        variant,
        `${relative(PACKAGE_ROOT, stylesheet)} is missing ${variant}`,
      );
    }
    assertMatch(
      css,
      /__mark > :where\(img, svg\)/,
      `${relative(PACKAGE_ROOT, stylesheet)} does not adapt injected graphics`,
    );
  }
  const utilities = await Deno.readTextFile(
    join(PACKAGE_ROOT, "src", "styles", "utilities.css"),
  );
  assertStringIncludes(utilities, ".discern-dotted-underline");
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

Deno.test("people monograms use interface type while names remain independently styled", async () => {
  const stylesheets = (await walk(join(COMPONENT_ROOT, "people")))
    .filter((path) => path.endsWith(".css"));
  let monogramRules = 0;
  for (const stylesheet of stylesheets) {
    const css = await Deno.readTextFile(stylesheet);
    for (
      const rule of css.matchAll(
        /([^{}]*(?:monogram|initial)[^{}]*)\{([^{}]+)\}/gi,
      )
    ) {
      const declarations = rule[2] ?? "";
      if (!declarations.includes("font-family")) continue;
      monogramRules += 1;
      assertStringIncludes(
        declarations,
        "font-family: var(--discern-font-ui)",
        `${
          relative(PACKAGE_ROOT, stylesheet)
        } gives a monogram non-interface type`,
      );
    }
  }
  assert(monogramRules > 0, "no People monogram typography rules enrolled");
});

function rendersLinkedNavigation(source: string): boolean {
  return /<nav\b/.test(source) && /\bhref=/.test(source);
}

Deno.test("linked navigation adapters restore a fragment after client mounting", async () => {
  assert(
    rendersLinkedNavigation(
      "function Wayfinder(){return <nav><a href={destination}>Go</a></nav>}",
    ),
    "the fresh-name navigation fixture did not enter the detector",
  );
  const adapters = (await walk(COMPONENT_ROOT))
    .filter((path) => path.endsWith(".tsx"));
  let enrolled = 0;
  for (const adapter of adapters) {
    const source = await Deno.readTextFile(adapter);
    if (!rendersLinkedNavigation(source)) continue;
    enrolled += 1;
    assertStringIncludes(
      source,
      "useInitialFragmentTarget();",
      `${
        relative(PACKAGE_ROOT, adapter)
      } can mount fragment navigation without restoring the initial target`,
    );
  }
  assert(enrolled > 0, "no linked navigation adapters enrolled");
  assertStringIncludes(
    await Deno.readTextFile(join(PACKAGE_ROOT, "styleguide", "app.tsx")),
    "useInitialFragmentTarget();",
  );
});

Deno.test("component and utility styles stay token-driven across theme modes", async () => {
  const stylesheets = [
    ...(await walk(COMPONENT_ROOT)).filter((path) => path.endsWith(".css")),
    join(PACKAGE_ROOT, "src", "styles", "utilities.css"),
  ];
  for (const stylesheet of stylesheets) {
    assert(
      !/\[data-discern-theme=/.test(await Deno.readTextFile(stylesheet)),
      `${
        relative(PACKAGE_ROOT, stylesheet)
      } branches on a theme attribute instead of semantic tokens`,
    );
  }
});

Deno.test("terminal shares Code listing's theme-responsive surface roles", async () => {
  const styles = await Promise.all(
    [
      join(COMPONENT_ROOT, "display", "terminal", "terminal.css"),
      join(COMPONENT_ROOT, "editorial", "code-listing", "code-listing.css"),
    ].map((path) => Deno.readTextFile(path)),
  );
  for (
    const token of [
      "--discern-color-surface",
      "--discern-color-surface-sunken",
      "--discern-color-border-strong",
      "--discern-color-ink",
    ]
  ) {
    for (const style of styles) assertStringIncludes(style, token);
  }
  assert(!styles[0]?.includes("--discern-color-inverse-"));
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

Deno.test("Raw output leaves disclosure state to native CSS-free semantics", () => {
  function summaryTextFailures(
    cases: readonly {
      readonly name: string;
      readonly html: string;
      readonly label: string;
    }[],
  ): readonly string[] {
    const failures: string[] = [];
    for (const item of cases) {
      const summary = item.html.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)
        ?.[1] ?? "";
      const text = accessibleText(summary).replace(/\s+/g, " ").trim();
      if (text !== item.label) {
        failures.push(
          `${item.name}: CSS-free summary exposes "${text}" instead of "${item.label}"`,
        );
      }
    }
    return failures;
  }

  const cases = [false, true].map((open) => ({
    name: open ? "open" : "closed",
    label: "Validator output",
    html: renderToStaticMarkup(
      createElement(RawOutput, {
        label: "Validator output",
        open,
        children: "ValidationError",
      }),
    ),
  }));
  assertEquals(summaryTextFailures(cases), []);
  assert(!cases[0]?.html.includes(' open=""'));
  assertMatch(cases[1]?.html ?? "", /<details\b[^>]*\bopen=""/);

  const syntheticFailures = summaryTextFailures([{
    name: "unrelated-disclosure",
    label: "Build log",
    html:
      "<details><summary>Build log<span>Offline</span><span>Online</span></summary></details>",
  }]);
  assertEquals(syntheticFailures.length, 1);
});

Deno.test("custom notice labels cannot replace canonical semantic state", () => {
  const retryCases = [
    { safeToRetry: true, token: "Safe to retry" },
    { safeToRetry: false, token: "Do not retry" },
  ] as const;
  for (const { safeToRetry, token } of retryCases) {
    const html = renderToStaticMarkup(
      createElement(RetryNotice, {
        safeToRetry,
        label: "Operator context",
        reason: "Inspect the current state first.",
      }),
    );
    assertStringIncludes(
      html,
      `<span class="discern-retry-notice__state">${token}</span>`,
    );
    assertStringIncludes(
      html,
      '<span class="discern-retry-notice__custom-label">Operator context</span>',
    );
  }

  const destructiveCases = [
    { tone: "warning", token: "Warning" },
    { tone: "danger", token: "Danger" },
  ] as const;
  for (const { tone, token } of destructiveCases) {
    const html = renderToStaticMarkup(
      createElement(DestructiveActionNotice, {
        tone,
        label: "Owner approval required",
        scope: "The selected directory.",
        impact: "Its contents will change.",
        recovery: "Create a recoverable copy first.",
      }),
    );
    assertStringIncludes(
      html,
      `<span class="discern-destructive-action-notice__state">${token}</span>`,
    );
    assertStringIncludes(
      html,
      '<span class="discern-destructive-action-notice__custom-label">Owner approval required</span>',
    );
  }
});

Deno.test("procedure grammar preserves sequence and state in plain HTML", () => {
  const html = renderToStaticMarkup(
    createElement(Procedure, {
      title: "Restore a directory",
      prerequisites: {
        items: [{
          requirement: "The backup is readable.",
          state: "satisfied",
        }, {
          requirement: "The destination is empty.",
          state: "unresolved",
        }],
      },
      steps: [{
        title: "Inspect the archive",
        action: "List its contents before extracting anything.",
        command: { command: "tar -tf backup.tar" },
        expectedResult: {
          variant: "state",
          children: "The archive lists successfully.",
        },
        branch: {
          choices: [{
            label: "It worked",
            path: "Continue to restore",
            href: "#restore",
          }, {
            label: "It failed",
            path: "Open recovery guidance",
            href: "#recover",
          }],
        },
        recovery: createElement(RetryNotice, {
          safeToRetry: true,
          reason: "The inspection does not change the archive.",
        }),
      }, {
        title: "Restore into a new destination",
        action: "Extract beside the source and inspect the result.",
      }],
      completion: "The restored copy has been inspected.",
    }),
  );

  assertMatch(
    html,
    /<ol class="discern-procedure__steps"><li class="discern-procedure__step"><article/,
  );
  assertEquals(
    (html.match(/<li class="discern-procedure__step">/g) ?? []).length,
    2,
  );
  assert(
    html.indexOf("Inspect the archive") <
      html.indexOf("Restore into a new destination"),
    "procedure step source order changed",
  );
  assertMatch(
    html,
    /<ul class="discern-branch-choice__choices"><li class="discern-branch-choice__choice">.*<ul class="discern-branch-choice__paths"><li class="discern-branch-choice__path"><a href="#restore">/s,
  );
  const spoken = accessibleText(html);
  assertStringIncludes(spoken, "Satisfied");
  assertStringIncludes(spoken, "Unresolved");
  assertStringIncludes(spoken, "Safe to retry");
  assertStringIncludes(spoken, "You are done when");

  const unsafeRetry = renderToStaticMarkup(
    createElement(RetryNotice, {
      safeToRetry: false,
      reason: "The action may already have moved the source.",
    }),
  );
  assertStringIncludes(accessibleText(unsafeRetry), "Do not retry");

  const warning = renderToStaticMarkup(
    createElement(DestructiveActionNotice, {
      scope: "The temporary directory.",
      impact: "Its files will be removed.",
      recovery: "Move it to recoverable storage first.",
    }),
  );
  assertStringIncludes(accessibleText(warning), "Warning");
  assertStringIncludes(warning, 'role="note"');

  const danger = renderToStaticMarkup(
    createElement(DestructiveActionNotice, {
      tone: "danger",
      scope: "The active directory.",
      impact: "Newer files will be replaced.",
      recovery: "Create a dated copy first.",
    }),
  );
  assertStringIncludes(accessibleText(danger), "Danger");
  assertStringIncludes(danger, 'role="alert"');
});

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
