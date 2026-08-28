import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registry } from "../catalogue/generated/registry.ts";
import {
  compareStateHref,
  parseCompareState,
  setCompareComponentSurface,
  setCompareCustomComponents,
  setCompareGlobalSurface,
} from "../catalogue/pages/compare/state.ts";
import {
  ComparisonItem,
  resolveCompareScope,
} from "../catalogue/pages/compare/page.tsx";

Deno.test("Compare requires a deliberate scope before selecting specimens", () => {
  assertEquals(resolveCompareScope(new URLSearchParams(), registry), undefined);
  assertEquals(
    resolveCompareScope(new URLSearchParams("group=core"), registry)?.components
      .every(({ meta }) => meta.group === "Core"),
    true,
  );
  assertEquals(
    resolveCompareScope(new URLSearchParams("scope=all"), registry)?.components
      .length,
    registry.length,
  );
});

Deno.test("custom Compare selection is canonical, de-duplicated, and shareable", () => {
  const state = parseCompareState(
    new URL(
      "https://catalogue.example/catalogue/review/?components=table,button,table,invented&surface=cli&surfaces=button:web&examples=table:rich-cells#compare-component-table",
    ),
    registry,
  );
  assertEquals(
    state.scope?.kind === "custom"
      ? state.scope.components.map(({ meta }) => meta.slug)
      : [],
    ["button", "table"],
  );
  assertEquals(state.globalSurface, "cli");
  assertEquals(state.surfaceOverrides, { button: "web" });
  assertEquals(state.exampleOverrides, { table: "rich-cells" });
  assertEquals(state.current, "table");
  assertEquals(
    compareStateHref(state),
    "/catalogue/review/?components=button%2Ctable&surface=cli&surfaces=button%3Aweb&examples=table%3Arich-cells#compare-component-table",
  );
});

Deno.test("Compare global and per-item surface actions preserve honest URL state", () => {
  const initial = parseCompareState(
    new URL(
      "https://catalogue.example/catalogue/review/?components=aperture-backdrop,button&surfaces=button:cli",
    ),
    registry,
  );
  const allCli = setCompareGlobalSurface(initial, "cli");
  assertEquals(allCli.globalSurface, "cli");
  assertEquals(allCli.surfaceOverrides, {});
  const buttonWeb = setCompareComponentSurface(allCli, "button", "web");
  assertEquals(buttonWeb.surfaceOverrides, { button: "web" });
  assertEquals(
    setCompareComponentSurface(buttonWeb, "button", "cli").surfaceOverrides,
    {},
  );
  assertEquals(
    setCompareCustomComponents(buttonWeb, ["button", "button", "table"])
      .scope?.components.map(({ meta }) => meta.slug),
    ["button", "table"],
  );
});

Deno.test("ordinary Compare items lead with one specimen and omit detail evidence", () => {
  const button = registry.find(({ meta }) => meta.slug === "button");
  assert(button !== undefined);
  const example = button.canonicalExamples[0];
  assert(example !== undefined);
  const markup = renderToStaticMarkup(
    createElement(ComparisonItem, {
      entry: button,
      surface: "web",
      exampleId: example.id,
      terminalTheme: "dark",
      overridden: false,
      onSurfaceChange: () => undefined,
      onExampleChange: () => undefined,
    }),
  );
  assertStringIncludes(markup, "<h3>Button</h3>");
  assertEquals(
    [...markup.matchAll(/data-discern-example-state=/g)].length,
    1,
  );
  assertEquals(markup.includes("<details"), false);
  assertStringIncludes(markup, "Open full detail");
});
