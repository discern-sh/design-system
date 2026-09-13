import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogue, catalogueEntry } from "./support/catalogue.ts";
import {
  ComponentDetailBreadcrumb,
  ComponentDetailNavigation,
} from "../catalogue/pages/components/detail-navigation.tsx";
import {
  ComponentCollectionCard,
  ComponentResultCard,
} from "../catalogue/pages/components/directory-card.tsx";
import { componentDirectory } from "../catalogue/pages/components/collections.ts";
import {
  componentExplorerHref,
  parseComponentExplorerState,
} from "../catalogue/pages/components/explorer-state.ts";
import { representativeComponentExampleImage } from "../catalogue/example-images.ts";
import { componentSearchRecords } from "../catalogue/routes.ts";
import {
  explanatoryMatchReason,
  searchRecords,
} from "../catalogue/search/mod.ts";

Deno.test("Component collections derive counts, summaries, imagery, browse, and Compare paths", async () => {
  const { registry } = await catalogue();
  const directory = componentDirectory(registry);
  assertEquals(directory.components, registry);
  for (const collection of [...directory.groups, ...directory.purposes]) {
    const markup = renderToStaticMarkup(
      createElement(ComponentCollectionCard, { collection }),
    );
    assertStringIncludes(
      markup,
      `${collection.members.length} Component${
        collection.members.length === 1 ? "" : "s"
      }`,
    );
    assertStringIncludes(markup, `href="${collection.browseHref}`);
    assertStringIncludes(markup, `href="${collection.compareHref}`);
    if (collection.members.length > 4) {
      assertStringIncludes(markup, `+${collection.members.length - 4} more`);
    }
    assertEquals(
      [...markup.matchAll(/data-discern-collection-image=/g)].length,
      Math.min(3, collection.members.length) * 2,
    );
    assertEquals(markup.includes("data-discern-component="), false);
  }
});

Deno.test("every Component result card uses generated representative imagery without mounting specimens", async () => {
  const { registry } = await catalogue();
  for (const entry of registry) {
    const markup = renderToStaticMarkup(
      createElement(ComponentResultCard, {
        entry,
        showGroup: true,
      }),
    );
    for (const theme of ["light", "dark"] as const) {
      const image = representativeComponentExampleImage(
        entry.meta.slug,
        theme,
      );
      assert(image !== undefined, `${entry.meta.slug}/${theme}`);
      assertStringIncludes(markup, `src="${image.assetUrl}"`);
      assertStringIncludes(markup, `width="${image.width}"`);
      assertStringIncludes(markup, `height="${image.height}"`);
    }
    assertStringIncludes(markup, `>${entry.meta.name}</h3>`);
    assertStringIncludes(
      markup,
      entry.cli.stance === "rendered" ? "Web and CLI" : "Web only",
    );
    assertEquals(markup.includes("data-discern-component="), false);
  }
});

Deno.test("Component result cards project the universal engine's match reason", async () => {
  const { registry } = await catalogue();
  const result = searchRecords(
    componentSearchRecords(registry),
    "call to action",
  )[0];
  assert(result?.record.payload !== undefined);
  const reason = explanatoryMatchReason(result);
  assert(reason !== undefined);
  assertEquals(result.record.title, "CTA band");
  const markup = renderToStaticMarkup(createElement(ComponentResultCard, {
    entry: result.record.payload,
    showGroup: true,
    matchReason: reason,
  }));
  assertStringIncludes(
    markup,
    `Matched ${reason.label.toLowerCase()}: ${reason.value}`,
  );
  assertStringIncludes(
    markup,
    'class="discern-catalogue-component-card__description" data-discern-catalogue-copy="decision"',
  );
  assertStringIncludes(
    markup,
    'class="discern-catalogue-component-card__match" data-discern-catalogue-copy="decision"',
  );

  const descriptionMatch = renderToStaticMarkup(
    createElement(ComponentResultCard, {
      entry: result.record.payload,
      showGroup: true,
      matchReason: {
        label: "Description",
        value: result.record.payload.meta.description,
      },
    }),
  );
  assertEquals(
    descriptionMatch.split(result.record.payload.meta.description).length - 1,
    1,
  );
  assertEquals(descriptionMatch.includes("Matched description:"), false);
});

Deno.test("Component explorer URL state round-trips canonical evidence", () => {
  const explorer = parseComponentExplorerState(
    new URL(
      "https://catalogue.example/catalogue/components/?q=proof&group=workflow&purpose=displaying-tool-output&all=1",
    ),
  );
  assertEquals(
    componentExplorerHref(explorer),
    "/catalogue/components/?q=proof&group=workflow&purpose=displaying-tool-output&all=1",
  );
});

Deno.test("detail navigation keeps native return, neighbour, and Compare destinations", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const breadcrumb = renderToStaticMarkup(
    createElement(ComponentDetailBreadcrumb, { entry: command }),
  );
  assertStringIncludes(breadcrumb, 'aria-label="Breadcrumb"');
  assertStringIncludes(breadcrumb, 'href="/catalogue/components/"');
  assertStringIncludes(
    breadcrumb,
    'href="/catalogue/components/?group=workflow"',
  );
  assertStringIncludes(breadcrumb, `aria-current="page">${command.meta.name}`);
  const navigation = renderToStaticMarkup(
    createElement(ComponentDetailNavigation, {
      entry: command,
      state: { surface: "cli", exampleId: "failure", view: "all" },
    }),
  );
  assertStringIncludes(navigation, 'aria-label="Component continuation"');
  assertEquals(navigation.includes('rel="prev"'), false);
  assertStringIncludes(navigation, 'rel="next"');
  assertStringIncludes(
    navigation,
    'href="/catalogue/review/?components=command&amp;surface=cli&amp;examples=command%3Afailure"',
  );
  for (
    const match of navigation.matchAll(/rel="(?:prev|next)" href="([^"]+)"/g)
  ) {
    const href = new URL(
      match[1]!.replaceAll("&amp;", "&"),
      "https://catalogue.example",
    );
    assert(href.pathname.startsWith("/catalogue/components/"));
    assertEquals(href.searchParams.get("surface"), "cli");
    assertEquals(href.searchParams.get("view"), "all");
    assert(href.searchParams.get("example"));
  }
  const following = renderToStaticMarkup(
    createElement(ComponentDetailNavigation, {
      entry: catalogueEntry(registry, "command-group"),
      state: { surface: "cli", exampleId: "failure", view: "all" },
    }),
  );
  assertStringIncludes(
    following,
    'rel="prev" href="/catalogue/components/command/?surface=cli&amp;example=failure&amp;view=all"',
  );
});

Deno.test("capability filters require authored behaviours and applicable canonical examples", async () => {
  const { componentSupportsSurface, matchesComponentCapabilities } =
    await import("../catalogue/pages/components/collections.ts");
  const { registry } = await catalogue();
  for (const entry of registry) {
    for (const availability of ["web", "cli"] as const) {
      assertEquals(
        componentSupportsSurface(entry, availability),
        (availability === "web" || entry.cli.stance === "rendered") &&
          entry.canonicalExamples.some(({ surfaces }) =>
            surfaces.includes(availability)
          ),
      );
    }
    assertEquals(
      matchesComponentCapabilities(entry, {
        query: "",
        showAll: true,
        behavior: "floating-surface",
      }),
      entry.meta.behaviors?.includes("floating-surface") === true,
    );
    assertEquals(
      componentSupportsSurface({ ...entry, canonicalExamples: [] }, "cli"),
      false,
    );
    assertEquals(
      matchesComponentCapabilities({
        ...entry,
        meta: { ...entry.meta, behaviors: [] },
      }, { query: "", showAll: true, behavior: "copy-button" }),
      false,
    );
  }
  const state = parseComponentExplorerState(
    new URL(
      "https://example.test/catalogue/components/?availability=cli&behavior=copy-button&group=forms&q=copy&all=1",
    ),
  );
  assertEquals(
    parseComponentExplorerState(
      new URL(componentExplorerHref(state), "https://example.test"),
    ),
    state,
  );
  assertEquals(
    parseComponentExplorerState(
      new URL(
        "https://example.test/catalogue/components/?availability=terminal&behavior=hydrated&group=unknown&purpose=nope",
      ),
    ),
    { query: "", showAll: false },
  );
});

Deno.test("discovery return URLs are local, canonical, shareable and preserve detail selections", async () => {
  const {
    componentDiscoveryDetailHref,
    componentReturnHref,
    preserveComponentReturnHref,
  } = await import("../catalogue/pages/components/return-context.ts");
  const origin = "https://example.test";
  const directory = new URL(
    "/catalogue/components/?q=command&group=workflow&availability=cli&all=1&theme=dark",
    origin,
  );
  const detail = new URL(
    componentDiscoveryDetailHref(
      directory,
      "/catalogue/components/command/",
      "command",
    ),
    origin,
  );
  assertEquals(detail.searchParams.get("surface"), "cli");
  assertEquals(detail.searchParams.get("theme"), "dark");
  const back = new URL(componentReturnHref(detail)!, origin);
  assertEquals(
    parseComponentExplorerState(back),
    parseComponentExplorerState(directory),
  );
  assertEquals(back.hash, "#component-result-command");
  const next = new URL(
    preserveComponentReturnHref(
      detail,
      "/catalogue/components/command-group/?surface=cli&example=failure#component-command-group--cli-failure",
    ),
    origin,
  );
  assertEquals(componentReturnHref(next), componentReturnHref(detail));
  assertEquals(next.searchParams.get("example"), "failure");
  assertEquals(next.hash, "#component-command-group--cli-failure");
  for (
    const value of [
      "https://evil.test/catalogue/components/",
      "//evil.test/catalogue/components/",
      "/catalogue/components/../../other/",
      "/catalogue/components/command/",
      "javascript:alert(1)",
      "/catalogue/components/\\evil.test/",
    ]
  ) {
    const bad = new URL("/catalogue/components/command/", origin);
    bad.searchParams.set("return", value);
    assertEquals(componentReturnHref(bad), undefined, value);
  }
  const invalid = new URL("/catalogue/components/command/", origin);
  invalid.searchParams.set(
    "return",
    "/catalogue/components/?availability=bogus&behavior=hydrated&return=recursive#arbitrary",
  );
  assertEquals(componentReturnHref(invalid), "/catalogue/components/");
  assertEquals(
    componentReturnHref(
      new URL("/catalogue/components/command/?example=failure", origin),
    ),
    undefined,
  );
});
