import { assertEquals } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentType } from "react";
import { componentRegistry } from "../src/generated/component-registry.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));

/**
 * Components whose canonical examples still lean on Catalogue chrome. The
 * Component review route loads only the package runtime, so these render
 * there without the spacing their published images show. Remove a slug once
 * its examples compose package primitives instead.
 */
const PENDING_CATALOGUE_CHROME = new Set([
  "button",
  "container",
  "field",
  "icon-button",
  "markdown",
  "overflow-cue",
  "skip-link",
  "stack",
  "theme-switcher",
  "theme-toggle",
]);

async function catalogueOnlyClasses(): Promise<ReadonlySet<string>> {
  const classes = new Set<string>();
  const directory = join(PACKAGE_ROOT, "catalogue", "styles");
  for await (const entry of Deno.readDir(directory)) {
    if (!entry.isFile || !entry.name.endsWith(".css")) continue;
    const css = await Deno.readTextFile(join(directory, entry.name));
    for (const [, name] of css.matchAll(/\.(discern-[a-z0-9_-]+)/g)) {
      classes.add(name!);
    }
  }
  for (const { ownedClasses } of componentRegistry) {
    for (const name of ownedClasses) classes.delete(name);
  }
  return classes;
}

Deno.test("canonical examples compose package classes the review route can style", async () => {
  const catalogueOnly = await catalogueOnlyClasses();
  assertEquals(
    catalogueOnly.has("discern-example-row"),
    true,
    "the Catalogue chrome fixture did not enter the detector",
  );
  const violations: string[] = [];
  let rendered = 0;
  const report = console.error;
  console.error = (...args: unknown[]) => {
    if (!String(args[0]).includes("useLayoutEffect does nothing")) {
      report(...args);
    }
  };
  try {
    for (const { meta } of componentRegistry) {
      const examplesPath = join(
        PACKAGE_ROOT,
        "src",
        "components",
        meta.group.toLowerCase(),
        meta.slug,
        `${meta.slug}.examples.tsx`,
      );
      const module = await import(`file://${examplesPath}`) as {
        readonly catalogueExamples?: readonly {
          readonly id: string;
          readonly Example: ComponentType;
        }[];
      };
      for (const { id, Example } of module.catalogueExamples ?? []) {
        const html = renderToStaticMarkup(<Example />);
        rendered += 1;
        if (PENDING_CATALOGUE_CHROME.has(meta.slug)) continue;
        for (const [, classes] of html.matchAll(/class="([^"]*)"/g)) {
          for (const name of classes!.split(/\s+/)) {
            if (catalogueOnly.has(name)) {
              violations.push(`${meta.slug}/${id}: ${name}`);
            }
          }
        }
      }
    }
  } finally {
    console.error = report;
  }
  assertEquals(
    violations,
    [],
    "a canonical example relies on Catalogue-only chrome; compose Stack, Cluster or a Component prop instead",
  );
  assertEquals(rendered > componentRegistry.length, true);
});
