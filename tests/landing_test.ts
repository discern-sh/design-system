import { assert, assertEquals } from "@std/assert";
import {
  landingAssets,
  type LandingFacts,
  landingSelection,
  renderLandingHtml,
} from "../catalogue/landing/page.tsx";
import { packageManifest } from "../src/manifest.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const facts: LandingFacts = {
  version: "0.0.0-test",
  system: {
    components: packageManifest.components.length,
    groups: packageManifest.groups.length,
    tokens: packageManifest.publicTokenNames.length,
  },
  emission: {
    resolvedComponents: landingSelection.length,
    cssBytes: 81_234,
    cssIntegrity: "sha256:0123456789abcdef0123456789abcdef",
  },
};

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

Deno.test("the landing page is deterministic static HTML with no scripts", () => {
  const html = renderLandingHtml(facts);
  assertEquals(html, renderLandingHtml(facts));
  assertEquals(/<script/i.test(html), false);
  assert(html.startsWith("<!doctype html>"));
  assert(html.includes('<html lang="en">'));
  assert(html.includes("<body data-discern-root>"));
  assert(html.includes("<title>discern design system</title>"));
  assert(html.includes(`v${facts.version}`));
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

Deno.test("every class the landing page renders is styled by its own emission", async () => {
  const outputDirectory = await Deno.makeTempDir({ prefix: "discern-landing" });
  try {
    const summary = await emitDesignSystemRuntime({
      outputRoot: new URL(`file://${outputDirectory}/`),
      components: landingSelection,
      assets: landingAssets,
    });
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
    const unstyled = [...renderedClasses(html)].filter((
      name,
    ) => !emitted.has(name) && !emitted.has(blockName(name)));
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
