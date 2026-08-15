import { assertEquals } from "@std/assert";
import { resolveCatalogueTerminalTheme } from "../catalogue/terminal-theme.ts";

Deno.test("Catalogue terminal theme resolves explicit and system modes", () => {
  assertEquals(resolveCatalogueTerminalTheme("light", true), "light");
  assertEquals(resolveCatalogueTerminalTheme("dark", false), "dark");
  assertEquals(resolveCatalogueTerminalTheme("system", false), "light");
  assertEquals(resolveCatalogueTerminalTheme("system", true), "dark");
});
