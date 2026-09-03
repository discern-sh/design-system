import { assertEquals } from "@std/assert";
import {
  resolveCatalogueTerminalPresentation,
  resolveCatalogueTerminalTheme,
} from "../catalogue/terminal-theme.ts";

const catalogueRoot = new URL("../catalogue/", import.meta.url);

async function catalogueGroundOnlyTerminalSources(
  directory = catalogueRoot,
  prefix = "catalogue",
): Promise<readonly string[]> {
  const sources: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name === "generated") continue;
    const url = new URL(
      `${entry.name}${entry.isDirectory ? "/" : ""}`,
      directory,
    );
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory) {
      sources.push(...await catalogueGroundOnlyTerminalSources(url, path));
      continue;
    }
    if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      (await Deno.readTextFile(url)).includes("TerminalThemeVariant")
    ) {
      sources.push(path);
    }
  }
  return sources.toSorted();
}

Deno.test("Catalogue terminal theme resolves explicit and system modes", () => {
  assertEquals(resolveCatalogueTerminalTheme("light", true), "light");
  assertEquals(resolveCatalogueTerminalTheme("dark", false), "dark");
  assertEquals(resolveCatalogueTerminalTheme("system", false), "light");
  assertEquals(resolveCatalogueTerminalTheme("system", true), "dark");
});

Deno.test("Catalogue terminal adapter preserves ground, identity, and numeric hue", () => {
  assertEquals(
    resolveCatalogueTerminalPresentation("light", undefined),
    { theme: "light", appearance: {} },
  );
  assertEquals(
    resolveCatalogueTerminalPresentation("dark", 137.5),
    { theme: "dark", appearance: { accent: 137.5 } },
  );
});

Deno.test("Catalogue has one adapter from ground to terminal appearance", async () => {
  assertEquals(await catalogueGroundOnlyTerminalSources(), [
    "catalogue/terminal-theme.ts",
  ]);
});
