import { assert, assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import {
  landingAssets,
  landingCatalogueDestinations,
  type LandingFacts,
  landingPageSections,
  landingSelection,
  renderLandingHtml,
} from "../catalogue/landing/page.tsx";
import { landingSystemFacts } from "../catalogue/landing/facts.ts";
import {
  overviewCatalogueDestinations,
  OverviewPage,
} from "../catalogue/pages/overview/page.tsx";
import { componentExplorerHref } from "../catalogue/pages/components/state.ts";
import { catalogueNavigation } from "../catalogue/routes.ts";
import { cliComponentRegistry } from "../src/generated/cli-registry.ts";
import { packageManifest } from "../src/manifest.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const cliStances: Readonly<
  Record<string, { readonly stance: "rendered" | "exempt" }>
> = cliComponentRegistry;

const facts: LandingFacts = {
  version: "0.0.0-test",
  system: landingSystemFacts,
  emission: {
    resolvedComponents: landingSelection.length,
    cssBytes: 81_234,
    cssIntegrity: "sha256:0123456789abcdef0123456789abcdef",
    scripts: [],
  },
  pageScripts: ["theme-preference.js"],
};

Deno.test("landing system facts derive complete browser and terminal coverage", () => {
  assertEquals(
    landingSystemFacts.coverage.length,
    packageManifest.groups.length,
  );
  assertEquals(
    landingSystemFacts.coverage.reduce(
      (total, group) => total + group.browserComponents,
      0,
    ),
    packageManifest.components.length,
  );
  for (const coverage of landingSystemFacts.coverage) {
    const group = packageManifest.groups.find(({ name }) =>
      name === coverage.group
    );
    assert(group !== undefined);
    assertEquals(coverage.browserComponents, group.components.length);
    assertEquals(
      coverage.terminalComponents,
      group.components.filter((id) => cliStances[id]?.stance === "rendered")
        .length,
    );
  }
});

function renderedClasses(html: string): ReadonlySet<string> {
  const classes = new Set<string>();
  for (const attribute of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of (attribute[1] ?? "").split(/\s+/)) {
      if (name.startsWith("discern-")) classes.add(name);
    }
  }
  return classes;
}

function definedClasses(css: string): ReadonlySet<string> {
  return new Set(
    [...css.matchAll(/\.(discern-[A-Za-z0-9_-]+)/g)].map((match) => match[1])
      .filter((name): name is string => name !== undefined),
  );
}

/**
 * A component may render a default-variant class as a consumer styling hook
 * without emitting a rule for it, so coverage holds at the block level: the
 * class itself or its owning block must be styled.
 */
function blockName(name: string): string {
  const element = name.indexOf("__");
  const modifier = name.indexOf("--");
  return name.slice(
    0,
    Math.min(
      element === -1 ? name.length : element,
      modifier === -1 ? name.length : modifier,
    ),
  );
}

function unstyledClasses(
  rendered: ReadonlySet<string>,
  defined: ReadonlySet<string>,
): readonly string[] {
  const definedBlocks = new Set([...defined].map(blockName));
  return [...rendered].filter((name) =>
    !defined.has(name) && !definedBlocks.has(blockName(name))
  );
}

Deno.test("landing style coverage recognises an emitted Component block", () => {
  assertEquals(
    unstyledClasses(
      new Set(["discern-future-component"]),
      new Set(["discern-future-component__part"]),
    ),
    [],
  );
  assertEquals(
    unstyledClasses(
      new Set(["discern-future-component"]),
      new Set(["discern-unrelated__part"]),
    ),
    ["discern-future-component"],
  );
});

Deno.test("the landing page is deterministic HTML with one page-owned behavior", () => {
  const html = renderLandingHtml(facts);
  assertEquals(html, renderLandingHtml(facts));
  assertEquals([...html.matchAll(/<script\b/gi)].length, 1);
  assert(html.includes('src="/dist/landing/theme-preference.js"'));
  assert(html.startsWith("<!doctype html>"));
  assert(html.includes('<html lang="en" data-discern-root'));
  assert(
    html.includes(
      'data-discern-theme-storage-key="discern-design-system-theme"',
    ),
  );
  assert(html.includes("<title>discern design system</title>"));
  assert(html.includes(`v${facts.version}`));
  assert(html.includes('class="discern-skip-link" href="#main-content"'));
  assert(html.includes('<main id="main-content"'));
  assert(html.includes("discern-theme-toggle"));
  assert(html.includes("Browser components."));
  assert(html.includes("Terminal renderers."));
  assert(html.includes("Author the meaning. Let the system draw it."));
  assert(html.includes("A component inventory that counts itself."));
  assert(html.includes("Two native renderings. No injected HTML."));
  assert(html.includes('data-discern-diagram-kind="flow"'));
  assert(html.includes('data-discern-chart-kind="heatmap"'));
  assert(html.includes("Selected components"));
  assert(html.includes(
    `${facts.emission.resolvedComponents} of ${facts.system.components}`,
  ));
});

Deno.test("both front doors project the canonical Catalogue routes", () => {
  const canonical = catalogueNavigation.map(({ id, label, path }) => ({
    id,
    label,
    path,
  }));
  assertEquals(
    landingCatalogueDestinations.map(({ id, label, path }) => ({
      id,
      label,
      path,
    })),
    canonical,
  );
  assertEquals(
    overviewCatalogueDestinations.map(({ id, label, path }) => ({
      id,
      label,
      path,
    })),
    canonical.slice(1),
  );

  const landing = renderLandingHtml(facts);
  const header = landing.match(
    /<header[^>]*data-discern-catalogue-navigation="landing-header"[^>]*>(.*?)<\/header>/s,
  )?.[1] ?? "";
  const footer = landing.match(
    /<footer[^>]*data-discern-catalogue-navigation="landing-footer"[^>]*>(.*?)<\/footer>/s,
  )?.[1] ?? "";
  const projectedLinks = (markup: string) =>
    [...markup.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
      .map(([, href, label]) => ({ href, label }))
      .filter(({ href }) => canonical.some(({ path }) => path === href));
  assertEquals(
    projectedLinks(header),
    canonical.map(({ path, label }) => ({
      href: path,
      label,
    })),
  );
  assertEquals(
    projectedLinks(footer),
    canonical.map(({ path, label }) => ({
      href: path,
      label,
    })),
  );
});

Deno.test("both front doors make Find a Component their primary Catalogue action", () => {
  const searchReadyHref = componentExplorerHref({ query: "", showAll: true });
  const primaryAction =
    /<a(?=[^>]*data-discern-primary-catalogue-action="")(?=[^>]*href="([^"]+)")[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<\/a>/;
  const landing = renderLandingHtml(facts).match(primaryAction);
  const overview = renderToStaticMarkup(OverviewPage()).match(primaryAction);
  assertEquals(
    { href: landing?.[1], label: landing?.[2] },
    { href: searchReadyHref, label: "Find a Component" },
  );
  assertEquals(
    { href: overview?.[1], label: overview?.[2] },
    { href: searchReadyHref, label: "Find a Component" },
  );
});

Deno.test("Overview route cards are bounded, ordered, labelled destinations", () => {
  const overview = renderToStaticMarkup(OverviewPage());
  const cards = [...overview.matchAll(
    /<a[^>]*data-discern-catalogue-destination="([^"]+)"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs,
  )].map(([, id, href, content]) => ({ id, href, content: content ?? "" }));
  assertEquals(
    cards.map(({ id, href }) => ({ id, href })),
    overviewCatalogueDestinations.map(({ id, path }) => ({ id, href: path })),
  );
  for (const card of cards) {
    assert(
      /<small>\d+ [^<]+<\/small>/.test(card.content),
      `${card.id} must present a source-backed count with its unit`,
    );
    assert(
      /discern-catalogue-route-card__action/.test(card.content),
      `${card.id} must name its bounded action`,
    );
  }
  assert(
    overview.includes("/catalogue/generated/example-images/"),
    "Overview must consume the generated Component-image authority",
  );
});

Deno.test("landing in-page navigation owns unique live targets", () => {
  const html = renderLandingHtml(facts);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id ?? "");
  assertEquals(new Set(ids).size, ids.length);
  for (const { id, label } of landingPageSections) {
    assertEquals(ids.filter((candidate) => candidate === id).length, 1);
    assert(
      html.includes(`href="#${id}"`),
      `${label} lacks its On this page link`,
    );
    assert(
      html.includes(`id="${id}" tabindex="-1"`),
      `${label} target must accept programmatic focus`,
    );
  }
});

Deno.test("the landing selection is sorted, unique, and canonical", () => {
  assertEquals([...landingSelection].sort(), [...landingSelection]);
  assertEquals(new Set(landingSelection).size, landingSelection.length);
  const known = new Set(packageManifest.components.map(({ id }) => id));
  for (const slug of landingSelection) {
    assert(
      known.has(slug),
      `landing selection names unknown component ${slug}`,
    );
  }
});

Deno.test("landing behavior files are the page script inventory", async () => {
  const scripts: string[] = [];
  for await (
    const entry of Deno.readDir(
      new URL("../catalogue/landing/behaviors/", import.meta.url),
    )
  ) {
    if (entry.isFile && entry.name.endsWith(".js")) scripts.push(entry.name);
  }
  scripts.sort();
  assertEquals(scripts, facts.pageScripts);
});

Deno.test("every class the landing page renders is styled by its own emission", async () => {
  const outputDirectory = await Deno.makeTempDir({ prefix: "discern-landing" });
  try {
    const summary = await emitDesignSystemRuntime({
      outputRoot: new URL(`file://${outputDirectory}/`),
      components: landingSelection,
      assets: landingAssets,
    });
    assertEquals(
      summary.manifest.outputs.scripts,
      [],
      "Theme preference stays a Catalogue consumer policy, not package behavior",
    );
    const stylesheets = [
      summary.manifest.outputs.css,
      ...summary.manifest.outputs.assets.filter((path) =>
        path.endsWith(".css")
      ),
    ];
    const html = renderLandingHtml(facts);
    for (const stylesheet of stylesheets) {
      assert(
        html.includes(`href="/dist/landing/${stylesheet}"`),
        `landing document must link every emitted stylesheet; missing ${stylesheet}`,
      );
    }
    const emitted = new Set<string>();
    for (const stylesheet of stylesheets) {
      for (
        const name of definedClasses(
          await Deno.readTextFile(`${outputDirectory}/${stylesheet}`),
        )
      ) {
        emitted.add(name);
      }
    }
    const unstyled = unstyledClasses(renderedClasses(html), emitted);
    assertEquals(
      unstyled,
      [],
      "landing page renders classes its emission does not style — extend landingSelection",
    );
  } finally {
    await Deno.remove(outputDirectory, { recursive: true });
  }
});

Deno.test("every requested landing component appears on the page", () => {
  const used = renderedClasses(renderLandingHtml(facts));
  const dead = landingSelection.filter((slug) => {
    const component = packageManifest.components.find(({ id }) => id === slug);
    return component !== undefined &&
      !component.ownedClasses.some((name) => used.has(name));
  });
  assertEquals(
    dead,
    [],
    "landing selection requests components the page never renders — trim landingSelection",
  );
});
