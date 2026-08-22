import { assertEquals } from "@std/assert";
import { componentGroups } from "../src/types/component-meta.ts";
import {
  canonicalCatalogueLegacyUrl,
  catalogueComponentPath,
  catalogueGroupFromSlug,
  catalogueGroupSlug,
  catalogueRoute,
  catalogueRoutePaths,
} from "../catalogue/routes.ts";

Deno.test("Catalogue routes resolve every explorer surface and Component detail", () => {
  const cases = [
    [catalogueRoutePaths.overview, { kind: "overview" }],
    [catalogueRoutePaths.foundations, { kind: "foundations" }],
    [catalogueRoutePaths.components, { kind: "components" }],
    [catalogueComponentPath("command-group"), {
      kind: "component",
      slug: "command-group",
    }],
    [catalogueRoutePaths.compositions, { kind: "compositions" }],
    [catalogueRoutePaths.terminal, { kind: "terminal" }],
    [catalogueRoutePaths.review, { kind: "review" }],
    ["/catalogue/unknown/", { kind: "not-found" }],
  ] as const;

  for (const [pathname, expected] of cases) {
    assertEquals(
      catalogueRoute(new URL(pathname, "https://catalogue.example")),
      expected,
    );
  }
});

Deno.test("Catalogue Group slugs round-trip from the canonical vocabulary", () => {
  for (const group of componentGroups) {
    assertEquals(catalogueGroupFromSlug(catalogueGroupSlug(group)), group);
  }
  assertEquals(catalogueGroupFromSlug("invented"), undefined);
});

Deno.test("legacy one-page Catalogue links upgrade to routed destinations", () => {
  const cases = [
    {
      current:
        "https://catalogue.example/catalogue/#component-command--overflow",
      expected:
        "https://catalogue.example/catalogue/components/command/#component-command--overflow",
    },
    {
      current: "https://catalogue.example/catalogue/#group-workflow",
      expected:
        "https://catalogue.example/catalogue/components/?group=workflow",
    },
    {
      current:
        "https://catalogue.example/catalogue/?purpose=displaying-tool-output",
      expected:
        "https://catalogue.example/catalogue/components/?purpose=displaying-tool-output",
    },
    {
      current: "https://catalogue.example/catalogue/?surface=cli",
      expected:
        "https://catalogue.example/catalogue/review/?surface=cli&scope=all",
    },
    {
      current: "https://catalogue.example/catalogue/#tokens-color",
      expected: "https://catalogue.example/catalogue/foundations/#tokens-color",
    },
    {
      current: "https://catalogue.example/catalogue/#recipe-next-action",
      expected:
        "https://catalogue.example/catalogue/compositions/#recipe-next-action",
    },
    {
      current:
        "https://catalogue.example/catalogue/#terminal-layout-command-reference",
      expected:
        "https://catalogue.example/catalogue/terminal/#terminal-layout-command-reference",
    },
  ] as const;

  for (const testCase of cases) {
    assertEquals(
      canonicalCatalogueLegacyUrl(new URL(testCase.current)).href,
      testCase.expected,
      testCase.current,
    );
  }

  const conformance = new URL(
    "https://catalogue.example/catalogue/?conformance=1#component-command",
  );
  assertEquals(canonicalCatalogueLegacyUrl(conformance).href, conformance.href);
  const routed = new URL(
    "https://catalogue.example/catalogue/components/command/",
  );
  assertEquals(canonicalCatalogueLegacyUrl(routed).href, routed.href);
});
