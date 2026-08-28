import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { buildDesignSystem } from "../scripts/build.ts";
import { componentGroups } from "../src/types/component-meta.ts";
import { defaultProps } from "../catalogue/builder/controls.ts";
import { newBuilderStructuredRow } from "../catalogue/builder/defaults.ts";
import { documentToTsx } from "../catalogue/builder/export.ts";
import { emptyDocument, insertChild } from "../catalogue/builder/model.ts";
import { GuardedBuilderStorage } from "../catalogue/builder/persistence.ts";
import { armedSlotInsertionTarget } from "../catalogue/builder/tree/projection.ts";
import {
  BUILDER_RECENT_LIMIT,
  builderPaletteDensities,
  normaliseBuilderDiscoveryPreferences,
  recordRecentDiscoveryId,
  restoreBuilderDiscoveryPreferences,
  toggleFavouriteDiscoveryId,
} from "../catalogue/builder/discovery/preferences.ts";

interface BuiltDiscoveryModules {
  readonly registry:
    typeof import("../catalogue/builder/discovery/registry.ts");
  readonly core: typeof import("../catalogue/builder/registry-core.ts");
  readonly templates:
    typeof import("../catalogue/builder/discovery/templates.ts");
}

let builtModules: Promise<BuiltDiscoveryModules> | undefined;

function discoveryModules(): Promise<BuiltDiscoveryModules> {
  builtModules ??= (async () => {
    await buildDesignSystem();
    const [registry, core, templates] = await Promise.all([
      import("../catalogue/builder/discovery/registry.ts"),
      import("../catalogue/builder/registry-core.ts"),
      import("../catalogue/builder/discovery/templates.ts"),
    ]);
    return { registry, core, templates };
  })();
  return builtModules;
}

Deno.test("discovery enrolls every registry member through shared search, imagery, and both densities", async () => {
  const { registry, core } = await discoveryModules();
  assertEquals(builderPaletteDensities, ["visual", "compact"]);
  assertEquals(
    registry.builderDiscoveryRecords.map(({ payload }) => payload?.core),
    [...core.registryCoreEntries],
  );
  assertEquals(
    new Set(registry.builderDiscoveryRecords.map(({ slug }) => slug)),
    new Set(core.registryCoreEntries.map(({ registry }) => registry.meta.slug)),
  );
  assertEquals(
    new Set(registry.builderDiscoveryRecords.map(({ group }) => group)),
    new Set(componentGroups),
  );
  for (const record of registry.builderDiscoveryRecords) {
    for (const theme of ["light", "dark"] as const) {
      const presentation = registry.discoveryImagePresentation(record, theme);
      assert(
        presentation !== undefined,
        `${record.slug} has no ${theme} image`,
      );
      assert(presentation.width > 0 && presentation.height > 0);
      assertStringIncludes(
        presentation.src,
        "/catalogue/generated/example-images/",
      );
    }
    assert(
      record.payload?.surface === "Web" ||
        record.payload?.surface === "Web + CLI",
    );
  }
});

Deno.test("Builder search uses shared intent aliases, source facts, ranking, and human purposes", async () => {
  const { registry } = await discoveryModules();
  const intent = registry.discoverBuilderComponents(
    "call to action",
    undefined,
  );
  assertEquals(intent[0]?.record.title, "CTA band");
  assertEquals(
    registry.builderDiscoveryMatchReason(intent[0]!, "call to action"),
    "Name matches “cta”",
  );
  assert(
    registry.discoverBuilderComponents("command line interface", undefined)
      .some(({ record }) => record.title === "Sparkline"),
  );
  assert(
    registry.discoverBuilderComponents("campaign", undefined)
      .some(({ record }) => record.title === "Site header"),
  );
  assert(
    registry.discoverBuilderComponents("marketing site", undefined)
      .some(({ record }) => record.title === "Marketing section"),
  );
  assertEquals(
    registry.builderPurposeLabel("marketing-site"),
    "Marketing site",
  );
  assertEquals(
    registry.builderPurposeLabel("building-documentation"),
    "Building documentation",
  );
  assertEquals(
    registry.builderPurposeLabel("procedural-workflow"),
    "Procedural workflow",
  );
});

Deno.test("contextual discovery consumes tree preflight and suspends unrelated purpose filtering", async () => {
  const { registry, core } = await discoveryModules();
  assert(
    !registry.discoverBuilderComponents("Button", "marketing-site")
      .some(({ record }) => record.title === "Button"),
  );

  const hero = core.instantiateComponent(
    "hero-block",
    (() => {
      let index = 0;
      return () => `hero-${String(++index)}`;
    })(),
  );
  const heroDocument = insertChild(
    emptyDocument("Hero actions"),
    { parent: "root" },
    0,
    hero,
  );
  const heroActions = armedSlotInsertionTarget(
    heroDocument,
    hero.id,
    "actions",
  );
  assert(heroActions !== undefined);
  const heroCompatible = registry.compatibleBuilderDiscoverySlugs(
    heroDocument,
    heroActions,
  );
  assert(heroCompatible.has("button"));
  const buttonResults = registry.discoverBuilderComponents(
    "Button",
    "marketing-site",
    { compatibleSlugs: heroCompatible },
  );
  assertEquals(buttonResults[0]?.record.title, "Button");
  assert(
    buttonResults.some(({ record }) => record.title === "Button"),
  );
  assert(
    buttonResults.every(({ record }) =>
      record.slug !== undefined && heroCompatible.has(record.slug)
    ),
  );

  const button = core.instantiateComponent(
    "button",
    (() => {
      let index = 0;
      return () => `button-${String(++index)}`;
    })(),
  );
  const buttonDocument = insertChild(
    emptyDocument("Nested interaction"),
    { parent: "root" },
    0,
    button,
  );
  const buttonChildren = armedSlotInsertionTarget(
    buttonDocument,
    button.id,
    "children",
  );
  assert(buttonChildren !== undefined);
  const buttonCompatible = registry.compatibleBuilderDiscoverySlugs(
    buttonDocument,
    buttonChildren,
  );
  assert(!buttonCompatible.has("button"));
  assert(buttonCompatible.size > 0);
});

Deno.test("palette source cannot regress to live mounts, dead previews, or unstable images", async () => {
  const source = await Deno.readTextFile(
    new URL(
      "../catalogue/builder/discovery/palette.tsx",
      import.meta.url,
    ),
  );
  assert(!source.includes("renderBuilderChild"));
  assert(!source.includes("instantiateComponent"));
  assert(!source.includes("IntersectionObserver"));
  assert(!source.includes("PalettePreview"));
  assertStringIncludes(source, "<CardImage entry={entry} />");
  assertStringIncludes(source, "width={presentation.width}");
  assertStringIncludes(source, "height={presentation.height}");
  assertStringIncludes(source, 'loading="lazy"');
  assertStringIncludes(source, 'decoding="async"');
  assertStringIncludes(source, "builderPaletteDensities.map");
  assertStringIncludes(source, "componentGroups.flatMap");
  assertStringIncludes(source, "builderBlocks.map");
});

Deno.test("Builder creation seeds are meaningful while public defaults remain untouched", async () => {
  const { core } = await discoveryModules();
  const heroCore = core.registryCoreBySlug.get("hero-block");
  assert(heroCore !== undefined);
  const publicHero = defaultProps(
    heroCore.controls,
    heroCore.registry.builderDefaults,
  );
  const publicTitle = publicHero.title;
  assert(publicTitle?.kind === "slot");
  assertEquals(publicTitle.children[0]?.kind, "text");
  if (publicTitle.children[0]?.kind === "text") {
    assertEquals(publicTitle.children[0].text, "Text");
  }

  const hero = core.instantiateComponent("hero-block");
  const title = hero.props.title;
  const description = hero.props.description;
  const actions = hero.props.actions;
  assert(title?.kind === "slot" && title.children[0]?.kind === "text");
  assertEquals(title.children[0].text, "Page title");
  assert(description?.kind === "slot" && description.children.length === 1);
  assert(actions?.kind === "slot" && actions.children[0]?.kind === "component");
  assertEquals(actions.children[0].slug, "button");

  const tabs = core.instantiateComponent("tabs");
  const items = tabs.props.items;
  assert(items?.kind === "json");
  const rows = JSON.parse(items.source) as Array<Record<string, unknown>>;
  assertEquals(rows.map(({ value }) => value), ["tab-1", "tab-2"]);
  assertEquals(rows.map(({ label }) => label), ["Tab 1", "Tab 2"]);
  assert(rows.every(({ content }) => typeof content === "string"));

  const button = core.instantiateComponent("button");
  const buttonLabel = button.props.children;
  assert(
    buttonLabel?.kind === "slot" &&
      buttonLabel.children[0]?.kind === "text",
  );
  assertEquals(buttonLabel.children[0].text, "Button label");

  const cta = core.instantiateComponent("cta-band");
  const ctaTitle = cta.props.title;
  const ctaActions = cta.props.actions;
  assert(ctaTitle?.kind === "slot" && ctaTitle.children[0]?.kind === "text");
  assertEquals(ctaTitle.children[0].text, "Ready for the next step?");
  assert(
    ctaActions?.kind === "slot" &&
      ctaActions.children[0]?.kind === "component",
  );
  assertEquals(ctaActions.children[0].slug, "button");

  const chartCore = core.registryCoreBySlug.get("chart");
  assert(chartCore !== undefined);
  const sourceBacked = defaultProps(
    chartCore.controls,
    chartCore.registry.builderDefaults,
  ).spec;
  assertEquals(core.instantiateComponent("chart").props.spec, sourceBacked);

  let idIndex = 0;
  const tooltip = core.instantiateComponent(
    "tooltip",
    () => `tooltip-seed-${String(++idIndex)}`,
  );
  const trigger = tooltip.props.children;
  assert(trigger?.kind === "slot");
  assert(trigger.children[0]?.kind === "component");
  assertStringIncludes(trigger.children[0].id, "tooltip-seed-");
});

Deno.test("structured row seeds are valid, unique, human, and focusable by contract", () => {
  const shape = {
    list: true,
    typeName: "TabItem",
    members: [
      {
        name: "value",
        label: "Value",
        required: true,
        typeText: "string",
        control: "text",
      },
      {
        name: "label",
        label: "Label",
        required: true,
        typeText: "string",
        control: "text",
      },
      {
        name: "content",
        label: "Content",
        required: true,
        typeText: "string",
        control: "text",
      },
    ],
  } as const;
  const first = newBuilderStructuredRow(shape, []);
  const second = newBuilderStructuredRow(shape, [first.row]);
  assertEquals(first.row, {
    value: "tab-1",
    label: "Tab 1",
    content: "Content for Tab 1.",
  });
  assertEquals(second.row, {
    value: "tab-2",
    label: "Tab 2",
    content: "Content for Tab 2.",
  });
  assertEquals(first.focusMember, "value");
});

Deno.test("all Builder starters and Blocks are accepted, live, derived, and deterministic", async () => {
  const { templates, core } = await discoveryModules();
  assertEquals(templates.builderStarters.length, 5);
  assertEquals(templates.builderBlocks.length, 5);
  const ids = (prefix: string) => {
    let index = 0;
    return () => `${prefix}-${String(++index)}`;
  };
  for (const template of templates.builderTemplates) {
    const first = template.createDocument(ids("first"));
    const second = template.createDocument(ids("second"));
    assertEquals(
      new Set(template.components),
      new Set(first.children.flatMap(function slugs(child): string[] {
        if (child.kind === "text") return [];
        return [
          child.slug,
          ...Object.values(child.props).flatMap((value) =>
            value.kind === "slot" ? value.children.flatMap(slugs) : []
          ),
        ];
      })),
    );
    assert(template.components.every((slug) => core.knownSlugs.has(slug)));
    assertEquals(
      documentToTsx(first, core.exportNaming),
      documentToTsx(second, core.exportNaming),
    );
    if (template.kind === "block") {
      assertEquals(first.children.length, 1);
      assertEquals(
        templates.instantiateBuilderBlock(template, ids("block")),
        template.createDocument(ids("block")).children[0],
      );
    }
  }
});

Deno.test("Recent and Favourites are bounded and recover from stale, corrupt, or denied storage", () => {
  const liveIds = new Set(
    Array.from({ length: 12 }, (_, index) => `component:${String(index)}`),
  );
  const normalized = normaliseBuilderDiscoveryPreferences({
    density: "compact",
    collapsedGroups: ["Core", "Unknown", "Core"],
    recentIds: ["missing", "component:2", "component:2", "component:1"],
    favouriteIds: ["missing", "component:3"],
  }, liveIds);
  assertEquals(normalized.density, "compact");
  assertEquals(normalized.collapsedGroups, ["Core"]);
  assertEquals(normalized.recentIds, ["component:2", "component:1"]);
  assertEquals(normalized.favouriteIds, ["component:3"]);

  let preferences = normalized;
  for (const id of liveIds) {
    preferences = recordRecentDiscoveryId(preferences, id, liveIds);
  }
  assertEquals(preferences.recentIds.length, BUILDER_RECENT_LIMIT);
  assertEquals(new Set(preferences.recentIds).size, BUILDER_RECENT_LIMIT);
  preferences = toggleFavouriteDiscoveryId(
    preferences,
    "component:4",
    liveIds,
  );
  assert(preferences.favouriteIds.includes("component:4"));
  preferences = toggleFavouriteDiscoveryId(
    preferences,
    "component:4",
    liveIds,
  );
  assert(!preferences.favouriteIds.includes("component:4"));

  const corrupt = new GuardedBuilderStorage(() => ({
    getItem: () => "{",
    setItem: () => undefined,
  }));
  assertEquals(
    restoreBuilderDiscoveryPreferences(corrupt, liveIds).density,
    "visual",
  );
  const denied = new GuardedBuilderStorage(() => {
    throw new Error("denied");
  });
  assertEquals(
    restoreBuilderDiscoveryPreferences(denied, liveIds),
    normaliseBuilderDiscoveryPreferences({}, liveIds),
  );
});

Deno.test("shared search stays bounded across the complete Builder population", async () => {
  const { registry } = await discoveryModules();
  const started = performance.now();
  for (let index = 0; index < 50; index += 1) {
    registry.discoverBuilderComponents(
      index % 2 === 0 ? "call to action" : "procedural workflow",
      undefined,
    );
  }
  const elapsed = performance.now() - started;
  assert(
    elapsed < 500,
    `50 complete-population searches took ${elapsed.toFixed(1)}ms`,
  );
});
