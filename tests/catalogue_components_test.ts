import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ComponentPreview } from "../catalogue/pages/components/component-preview.tsx";
import { catalogue, catalogueEntry } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("Theme Toggle's Catalogue example presents one page-chrome control", async () => {
  const { registry } = await catalogue();
  const example = catalogueEntry(registry, "theme-toggle").webExamples[0];
  assert(example !== undefined);
  const markup = renderToStaticMarkup(
    createElement(example.Example),
  );
  assertEquals(
    markup.match(/class="[^"]*\bdiscern-theme-toggle\b[^"]*"/g)?.length,
    1,
  );
  assertEquals(markup.includes("Lorem ipsum"), false);
});

Deno.test("complete Component panels keep supporting disclosures closed in canonical order", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const markup = renderToStaticMarkup(
    createElement(ComponentPreview, {
      entry: command,
      surface: "web",
      terminalTheme: "dark",
      onSurfaceChange: () => undefined,
    }),
  );
  const summaries = [...markup.matchAll(/<summary>([^<]+)<\/summary>/g)].map(
    (match) => match[1],
  );
  assertEquals(summaries, [
    "Best practices",
    "Selection and React import",
    "Props and variants",
  ]);
  assertEquals([...markup.matchAll(/<details\b/g)].length, summaries.length);
  assert(!/<details\b[^>]*\bopen(?:\s|=|>)/.test(markup));
  assertStringIncludes(markup, "Web");
  assertStringIncludes(markup, "CLI");
  assertStringIncludes(markup, "Open source");
  assertEquals(markup.includes("<footer"), false);
  assertEquals(
    [
      ...markup.matchAll(
        /<section\b[^>]*\bdata-discern-example-state="[^"]+"[^>]*><header><h5>([^<]+)<\/h5>/g,
      ),
    ].map((match) => match[1]),
    command.webExamples.map(({ label }) => label),
  );
});

Deno.test("Command text carries the stronger readable type treatment", async () => {
  const source = await Deno.readTextFile(
    join(
      PACKAGE_ROOT,
      "src",
      "components",
      "workflow",
      "command",
      "command.css",
    ),
  );
  const rule = /\.discern-command__text\s*\{(?<body>[^}]*)\}/.exec(source);
  const body = rule?.groups?.body;
  assert(body !== undefined);
  assertStringIncludes(body, "font-size: var(--discern-font-size-sm);");
  assertStringIncludes(
    body,
    "font-weight: var(--discern-font-weight-strong);",
  );
});
