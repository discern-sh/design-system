import { assertEquals } from "@std/assert";
import { registry } from "../catalogue/generated/registry.ts";
import { resolveCompareScope } from "../catalogue/pages/compare/page.tsx";

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
