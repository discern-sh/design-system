import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import {
  cssAtRuleBlocks,
  cssDeclarations,
  cssQualifiedRuleBlocks,
} from "../scripts/css-syntax.ts";
import { launchBrowser } from "../scripts/browser.ts";
import { baseTokens } from "../src/tokens/tokens.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const INTER_UI_FAMILY = '"Discern Inter UI"';
const INTER_UI_FEATURE_SETTINGS =
  '"liga" 1, "calt" 1, "dlig" 1, "tnum" 1, "zero" 1, "ss03" 1, "salt" 1';
const FONT_SPECIFIC_FEATURE = /["'](?:dlig|tnum|zero|ss\d\d|salt)["']/iu;

interface FeatureToken {
  readonly name: string;
  readonly value: string;
}

async function walkCss(directory: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) files.push(...await walkCss(path));
    else if (entry.isFile && entry.name.endsWith(".css")) files.push(path);
  }
  return files.toSorted();
}

function customPropertyReferences(value: string): readonly string[] {
  return [...value.matchAll(/var\(\s*(--[-_a-z0-9]+)/giu)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
}

function fontSpecificFeatureTokens(
  tokens: readonly FeatureToken[],
): ReadonlySet<string> {
  return new Set(
    tokens.filter(({ value }) => FONT_SPECIFIC_FEATURE.test(value))
      .map(({ name }) => name),
  );
}

function inheritedFontFeatureViolations(
  path: string,
  css: string,
  tokens: readonly FeatureToken[],
): readonly string[] {
  const featureTokens = fontSpecificFeatureTokens(tokens);
  const parsed = cssQualifiedRuleBlocks(css);
  assertEquals(parsed.failures, [], `${path} must be structurally parseable`);
  return parsed.rules.flatMap(({ block, selector }) => {
    const declarations = cssDeclarations(block);
    const unsafe = declarations.some((declaration) =>
      declaration.name === "font-feature-settings" &&
      (FONT_SPECIFIC_FEATURE.test(declaration.value) ||
        customPropertyReferences(declaration.value).some((name) =>
          featureTokens.has(name)
        ))
    );
    return unsafe
      ? [`${path}::${selector.replaceAll(/\s+/gu, " ").trim()}`]
      : [];
  });
}

Deno.test("font-specific OpenType features stay bound to their font face", async () => {
  const futureTokens = [{
    name: "--discern-future-interface-features",
    value: "'salt' 1",
  }];
  assertEquals(
    inheritedFontFeatureViolations(
      "future.css",
      `.unrelated-future-widget {
        font-feature-settings: var(--discern-future-interface-features);
      }
      .another-future-widget {
        font-feature-settings: "ss12" 1;
      }`,
      futureTokens,
    ),
    [
      "future.css::.unrelated-future-widget",
      "future.css::.another-future-widget",
    ],
    "new token names and new stylesheet containers must enter the detector",
  );

  const stylesheets = (
    await Promise.all([
      walkCss(join(PACKAGE_ROOT, "assets")),
      walkCss(join(PACKAGE_ROOT, "src")),
      walkCss(join(PACKAGE_ROOT, "catalogue")),
    ])
  ).flat();
  const violations = (
    await Promise.all(
      stylesheets.map(async (stylesheet) =>
        inheritedFontFeatureViolations(
          relative(PACKAGE_ROOT, stylesheet),
          await Deno.readTextFile(stylesheet),
          baseTokens,
        )
      ),
    )
  ).flat().toSorted();
  assert(
    violations.length === 0,
    `${violations.length} font-specific feature properties inherit into unrelated descendant faces:\n${
      violations.slice(0, 20).join("\n")
    }`,
  );
});

Deno.test("the bundled UI face owns the Inter feature bundle", async () => {
  const fontCss = await Deno.readTextFile(
    join(PACKAGE_ROOT, "assets", "fonts.css"),
  );
  const parsed = cssAtRuleBlocks(fontCss, "font-face");
  assertEquals(parsed.failures, []);
  const uiFaces = parsed.blocks.map(({ block }) => cssDeclarations(block))
    .filter((declarations) =>
      declarations.some(({ name, value }) =>
        name === "font-family" && value === INTER_UI_FAMILY
      )
    );
  assertEquals(
    uiFaces.length,
    1,
    "the bundled UI face must have one authority",
  );
  const uiFace = uiFaces[0];
  assert(uiFace !== undefined);
  const descriptor = (name: string): string | undefined =>
    uiFace.findLast((declaration) => declaration.name === name)?.value;
  assertStringIncludes(descriptor("src") ?? "", "./fonts/inter.woff2");
  assertEquals(
    descriptor("font-feature-settings"),
    INTER_UI_FEATURE_SETTINGS,
  );

  const rootRules = cssQualifiedRuleBlocks(fontCss).rules
    .filter(({ selector }) => selector === ":where([data-discern-root])")
    .map(({ block }) => cssDeclarations(block));
  assertEquals(
    rootRules.length,
    1,
    "the font asset must have one Root override",
  );
  const rootRule = rootRules[0];
  assert(rootRule !== undefined);
  const uiFamily = rootRule.findLast(({ name }) => name === "--discern-font-ui")
    ?.value;
  assert(
    uiFamily?.startsWith(`${INTER_UI_FAMILY}, "Inter",`) === true,
    "the optional UI font role must select the face that owns its features",
  );
  assertEquals(
    [...fontSpecificFeatureTokens(baseTokens)],
    [],
    "font-specific features must not remain available as inheritable tokens",
  );
});

Deno.test("the browser applies the feature bundle through the dedicated Inter face", async () => {
  const fontBytes = await Deno.readFile(
    join(PACKAGE_ROOT, "assets", "fonts", "inter.woff2"),
  );
  const fontSource = `data:font/woff2;base64,${fontBytes.toBase64()}`;
  const browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 500 },
  });
  try {
    await page.setContent(`
      <style>
        @font-face {
          font-family: "Plain Inter";
          font-style: normal;
          font-weight: 400 700;
          src: url("${fontSource}") format("woff2");
        }
        @font-face {
          font-family: ${INTER_UI_FAMILY};
          font-style: normal;
          font-weight: 400 700;
          font-feature-settings: ${INTER_UI_FEATURE_SETTINGS};
          src: url("${fontSource}") format("woff2");
        }
        .sample {
          box-sizing: border-box;
          width: 900px;
          height: 120px;
          overflow: hidden;
          background: white;
          color: black;
          font-size: 96px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }
        #face { font-family: ${INTER_UI_FAMILY}; }
        #explicit {
          font-family: "Plain Inter";
          font-feature-settings: ${INTER_UI_FEATURE_SETTINGS};
        }
        #normal {
          font-family: "Plain Inter";
          font-feature-settings: normal;
        }
      </style>
      <div id="face" class="sample">sS 00000 123456789</div>
      <div id="explicit" class="sample">sS 00000 123456789</div>
      <div id="normal" class="sample">sS 00000 123456789</div>
    `);
    await page.evaluate(async () => await document.fonts.ready);
    const face = new Uint8Array(await page.locator("#face").screenshot());
    const explicit = new Uint8Array(
      await page.locator("#explicit").screenshot(),
    );
    const normal = new Uint8Array(await page.locator("#normal").screenshot());
    assertEquals(
      face,
      explicit,
      "the face descriptor must render like the same explicit Inter features",
    );
    assert(
      face.some((byte, index) => byte !== normal[index]),
      "the feature-owning face must render differently from plain Inter",
    );
  } finally {
    await browser.close();
  }
});
