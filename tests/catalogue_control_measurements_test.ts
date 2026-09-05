import { assertEquals } from "@std/assert";
import { cssDeclarations } from "../discern/scripts/component-css-metrics.ts";

function legacyControlHeights(css: string, file: string) {
  return cssDeclarations(css, file).filter(({ property, value }) =>
    /^(?:min-)?(?:height|block-size)$/u.test(property) &&
    /(?:^|[\s(,])(?:42px|2\.625rem)(?=$|[\s),])/iu.test(value)
  );
}

Deno.test("Catalogue control rows do not copy the former public height", async () => {
  const root = new URL("../", import.meta.url);
  const result = await new Deno.Command("git", {
    cwd: root,
    args: ["ls-files", "--", "catalogue/**/*.css"],
  }).output();
  assertEquals(result.success, true);
  const paths = new TextDecoder().decode(result.stdout).trim().split("\n");
  const violations = (await Promise.all(
    paths.map(async (path) =>
      legacyControlHeights(await Deno.readTextFile(new URL(path, root)), path)
    ),
  )).flat();
  assertEquals(violations, []);
});

Deno.test("a new Catalogue stylesheet cannot restore a copied control height", () => {
  const css = `.discern-future-workbench button { min-block-size: 2.625rem; }
    .discern-independent-panel input { height: calc(42px); }
    .discern-future-workbench { padding: 42px; }
    .discern-independent-panel select { min-height: var(--discern-control-size-md); }`;
  assertEquals(
    legacyControlHeights(css, "catalogue/future/panel.css").map((
      { property },
    ) => property),
    ["min-block-size", "height"],
  );
});
