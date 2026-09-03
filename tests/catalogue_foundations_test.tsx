import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoundationsNavigationContent } from "../catalogue/pages/foundations/navigation.tsx";
import { FoundationsPage } from "../catalogue/pages/foundations/page.tsx";
import {
  FieldPage,
  type FieldPageProps,
} from "../catalogue/pages/foundations/field-page.tsx";
import { fieldPoleTerminalProjections } from "../catalogue/pages/foundations/field-terminal.ts";
import {
  catalogueTerminalFoundationPath,
  foundationsPaths,
  foundationsRouteFamily,
  foundationsSearchRecords,
  foundationTokenCategories,
  foundationTokenExplorerState,
  foundationTokenExplorerUrl,
  matchingFoundationTokens,
} from "../catalogue/routes/foundations.ts";
import type { TerminalFoundationSheet } from "../catalogue/terminal-foundations.ts";
import { terminalFoundationSheets } from "../catalogue/terminal-foundations.ts";
import { resolveCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";
import { publicTokens } from "../src/token-inventory.ts";

const origin = "https://catalogue.example";
const fieldLight = resolveCatalogueTerminalPresentation(
  "light",
  "field",
  255,
);

function renderFoundations(
  pathname: string,
  options: Readonly<{
    sheets?: readonly TerminalFoundationSheet[];
    search?: string;
  }> = {},
): string {
  return renderToStaticMarkup(
    createElement(FoundationsPage, {
      terminalPresentation: fieldLight,
      url: new URL(`${pathname}${options.search ?? ""}`, origin),
      ...(options.sheets === undefined ? {} : { sheets: options.sheets }),
    }),
  );
}

Deno.test("Foundations family owns bounded Field, Token, and terminal sheet routes", () => {
  assertEquals(foundationsRouteFamily.match(foundationsPaths.index), {
    family: "foundations",
    page: "index",
  });
  assertEquals(foundationsRouteFamily.match(foundationsPaths.tokens), {
    family: "foundations",
    page: "tokens",
  });
  assertEquals(foundationsRouteFamily.match(foundationsPaths.field), {
    family: "foundations",
    page: "field",
  });
  assertEquals(foundationsRouteFamily.match(foundationsPaths.terminal), {
    family: "foundations",
    page: "terminal-index",
  });
  assertEquals(
    foundationsRouteFamily.match(catalogueTerminalFoundationPath("motifs")),
    { family: "foundations", page: "terminal-detail", sheetId: "motifs" },
  );
  assertEquals(
    foundationsRouteFamily.match("/catalogue/foundations/unrelated/"),
    undefined,
  );
  for (
    const pathname of [
      foundationsPaths.index,
      foundationsPaths.field,
      foundationsPaths.tokens,
      foundationsPaths.terminal,
      ...terminalFoundationSheets.map(({ id }) =>
        catalogueTerminalFoundationPath(id)
      ),
    ]
  ) {
    assertEquals(foundationsRouteFamily.ownsShellPath(pathname), true);
  }
});

Deno.test("Token URL state and authority-backed matching round-trip", () => {
  const requested = new URL(
    `${foundationsPaths.tokens}?theme=dark&q=body&category=typography`,
    origin,
  );
  const state = foundationTokenExplorerState(requested, publicTokens);
  assertEquals(state, { query: "body", category: "Typography" });
  assertEquals(
    matchingFoundationTokens(publicTokens, state).map(({ name }) => name),
    [
      "--discern-font-body",
      "--discern-font-weight-body",
      "--discern-leading-body",
      "--discern-font-size-md",
      "--discern-font-weight-strong",
    ],
  );

  const reset = foundationTokenExplorerUrl(requested, { query: "" });
  assertEquals(reset.pathname, foundationsPaths.tokens);
  assertEquals(reset.searchParams.get("theme"), "dark");
  assertEquals(reset.searchParams.has("q"), false);
  assertEquals(reset.searchParams.has("category"), false);

  const valueMatches = matchingFoundationTokens(publicTokens, {
    query: "0.85rem",
    category: "Typography",
  });
  assertEquals(valueMatches.map(({ name }) => name), [
    "--discern-font-size-xs",
  ]);
});

Deno.test("Token explorer auto-enrols every category and labels themed and single values", () => {
  const html = renderFoundations(foundationsPaths.tokens);
  assertEquals((html.match(/<h1/g) ?? []).length, 1);
  for (const category of foundationTokenCategories(publicTokens)) {
    assertStringIncludes(html, `>${category}</button>`);
    assertStringIncludes(html, `data-discern-token-category="${category}"`);
  }
  assertStringIncludes(
    html,
    'data-discern-token="--discern-color-ink"',
  );
  assertStringIncludes(html, 'data-discern-token-preview-values="themed"');
  assertStringIncludes(html, ">Light</span>");
  assertStringIncludes(html, ">Dark</span>");
  assertStringIncludes(
    html,
    'data-discern-token="--discern-accent-hue"',
  );
  assertStringIncludes(html, 'data-discern-token-preview-values="single"');
  assertStringIncludes(html, ">Value</span>");
  assertStringIncludes(html, "Copy custom property name");
  assertStringIncludes(html, "Copy authored value");
  assertStringIncludes(html, "Copy light value");
  assertStringIncludes(html, "Copy dark value");
  assertStringIncludes(html, "Replay motion");
  assertEquals(html.includes("data-replaying"), false);
});

Deno.test("Foundations index and terminal gallery stay bounded and source-backed", () => {
  const indexHtml = renderFoundations(foundationsPaths.index);
  assertEquals((indexHtml.match(/<h1/g) ?? []).length, 1);
  assertStringIncludes(indexHtml, `href="${foundationsPaths.tokens}"`);
  assertStringIncludes(indexHtml, `href="${foundationsPaths.field}"`);
  assertStringIncludes(indexHtml, `href="${foundationsPaths.terminal}"`);
  assertStringIncludes(indexHtml, `${publicTokens.length} Tokens`);
  assertStringIncludes(indexHtml, `${terminalFoundationSheets.length} sheets`);
  assertEquals(
    indexHtml.includes("data-discern-terminal-foundation-specimen"),
    false,
  );

  const terminalHtml = renderFoundations(foundationsPaths.terminal);
  assertEquals((terminalHtml.match(/<h1/g) ?? []).length, 1);
  for (const sheet of terminalFoundationSheets) {
    assertStringIncludes(
      terminalHtml,
      `data-discern-terminal-foundation-card="${sheet.id}"`,
    );
    assertStringIncludes(
      terminalHtml,
      `href="${catalogueTerminalFoundationPath(sheet.id)}"`,
    );
  }
  assertEquals(
    terminalHtml.includes("data-discern-terminal-foundation-specimen"),
    false,
  );
});

Deno.test("Field page dogfoods public controls and paints every field role", () => {
  const html = renderFoundations(foundationsPaths.field);
  assertStringIncludes(html, 'data-discern-foundations-page="field"');
  for (const axis of ["darkness", "structure", "emphasis", "density"]) {
    assertStringIncludes(html, `data-discern-field-axis="${axis}"`);
  }
  assertEquals((html.match(/type="range"/g) ?? []).length, 4);
  assertStringIncludes(html, "These are the same controls");
  assertStringIncludes(html, "Current projection");
  assertStringIncludes(html, 'data-discern-field-proof="accepted"');
  assertStringIncludes(html, "Package admission");
  assertStringIncludes(html, "No failed package invariants");
  for (
    const scope of [
      "field-to-accent-255",
      "accent-120-to-field",
      "accent-245-to-accent-335",
    ]
  ) assertStringIncludes(html, `data-discern-scope-demo="${scope}"`);
  assertStringIncludes(html, 'class="discern-button');
  assertStringIncludes(html, 'class="discern-badge');
  assertStringIncludes(html, 'class="discern-avatar-group');
  assertStringIncludes(html, "Copy consumer field snippet");
  assertStringIncludes(html, 'data-discern-field-terminal-pole="light"');
  assertStringIncludes(html, 'data-discern-field-terminal-pole="dark"');
  assertStringIncludes(
    html,
    'data-discern-field-role="--discern-color-canvas"',
  );
  assertStringIncludes(html, 'data-discern-field-role="--discern-color-ink"');
});

Deno.test("Field terminal sheet uses the existing inspector at both poles", () => {
  const projections = fieldPoleTerminalProjections();
  assertEquals(projections.map(({ theme }) => theme), ["light", "dark"]);
  for (const projection of projections) {
    assertStringIncludes(projection.output, "--discern-color-ink-muted");
    assertStringIncludes(
      projection.inspectorHtml,
      `${projection.theme === "light" ? "Light" : "Dark"} field pole`,
    );
    assertStringIncludes(
      projection.inspectorHtml,
      "data-discern-terminal-inspector",
    );
  }
});

Deno.test("Field page admits arbitrary Accent hues through the package proof", () => {
  const html = renderToStaticMarkup(
    createElement<FieldPageProps>(FieldPage, {
      appearance: "accent",
      accentHue: 145.5,
      field: {
        darkness: 0.6,
        structure: 1.2,
        emphasis: 1.5,
        density: 1.1,
      },
    }),
  );
  assertStringIncludes(html, 'data-discern-field-proof="accepted"');
  assertStringIncludes(html, "Accent · Hue 145.5");
  assertStringIncludes(html, 'data-discern-appearance="accent"');
});

Deno.test("a synthetic terminal sheet joins route, index, detail, navigation, and search projections", () => {
  const futureSheet = {
    id: "future-surface",
    title: "Future surface",
    description: "A future terminal foundation.",
    keywords: "unrelated kinetic proof",
    specimens: () => [{
      id: "kinetic-proof",
      title: "Kinetic proof",
      output: "future frame",
    }],
  } satisfies TerminalFoundationSheet;
  const path = catalogueTerminalFoundationPath(futureSheet.id);
  assertEquals(foundationsRouteFamily.match(path), {
    family: "foundations",
    page: "terminal-detail",
    sheetId: futureSheet.id,
  });

  const records = foundationsSearchRecords({
    tokens: publicTokens,
    terminalFoundations: [futureSheet],
  });
  assertEquals(
    records.find(({ id }) => id === "terminal-foundation:future-surface")?.href,
    path,
  );

  const indexHtml = renderFoundations(foundationsPaths.terminal, {
    sheets: [futureSheet],
  });
  assertStringIncludes(
    indexHtml,
    'data-discern-terminal-foundation-card="future-surface"',
  );
  const detailHtml = renderFoundations(path, { sheets: [futureSheet] });
  assertStringIncludes(
    detailHtml,
    'data-discern-terminal-foundation="future-surface"',
  );
  assertStringIncludes(
    detailHtml,
    'data-discern-terminal-foundation-specimen="kinetic-proof"',
  );
  assertStringIncludes(detailHtml, "future frame");

  const navigationHtml = renderToStaticMarkup(
    createElement(FoundationsNavigationContent, {
      route: {
        family: "foundations",
        page: "terminal-detail",
        sheetId: futureSheet.id,
      },
      url: new URL(path, origin),
      onNavigate: () => undefined,
      sheets: [futureSheet],
    }),
  );
  assertStringIncludes(navigationHtml, `href="${path}"`);
  assertStringIncludes(navigationHtml, 'aria-current="location"');
  assert(navigationHtml.includes("Future surface"));
});
