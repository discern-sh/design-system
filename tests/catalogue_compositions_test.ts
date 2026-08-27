import { assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { compositionRecipes } from "../catalogue/compositions.tsx";
import { renderDiagramSvg } from "../src/diagram/svg.ts";
import {
  markdownDiagramExampleSource,
  markdownDiagramExampleSpec,
} from "../src/diagram/markdown.example.ts";
import { catalogue } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("Catalogue writes its Markdown SVG preview from the typed spec", async () => {
  await catalogue();
  assertEquals(
    await Deno.readTextFile(
      join(PACKAGE_ROOT, markdownDiagramExampleSource.slice(1)),
    ),
    renderDiagramSvg(markdownDiagramExampleSpec, { theme: "adaptive" }),
  );
});

Deno.test("Composition source and order share the recipe authority", () => {
  assertEquals(
    compositionRecipes.map(({ id }) => id),
    [
      "documentation-task",
      "next-action",
      "failure-triage",
      "handoff-verification-report",
      "survey-artifacts",
      "reading-first-landing",
    ],
  );
  for (const recipe of compositionRecipes) {
    assertStringIncludes(
      recipe.source,
      'from "@discern-sh/design-system/react";',
    );
  }
});
