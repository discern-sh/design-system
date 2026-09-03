import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  ACCENT_ATTRIBUTE,
  ACCENT_NONE_VALUE,
  accentScopeAttributeSelector,
  appearancePoleProjection,
  appearanceScopeCss,
} from "../src/tokens/appearance-scope-css.ts";
import {
  appearanceColorRoleLaws,
  appearanceProjections,
  appearanceShadowRoleLaws,
  DEFAULT_ACCENT_HUE,
  evaluateAppearance,
  evaluateAppearanceShadows,
} from "../src/tokens/appearance.ts";

function concreteHue(value: string): string {
  return value.replaceAll(
    "var(--discern-accent-hue)",
    String(DEFAULT_ACCENT_HUE),
  );
}

Deno.test("static appearance poles are projections of the same role graph", () => {
  for (const mode of ["light", "dark"] as const) {
    const darkness = mode === "light" ? 0 : 1;
    const mono = appearancePoleProjection("mono", mode);
    assertEquals(mono.roles, evaluateAppearance({ darkness }));
    assertEquals(mono.shadows, evaluateAppearanceShadows({ darkness }));

    const accent = appearancePoleProjection("accent", mode);
    const expected = evaluateAppearance({
      darkness,
      accent: DEFAULT_ACCENT_HUE,
    });
    for (const law of appearanceColorRoleLaws) {
      assertEquals(
        concreteHue(accent.roles[law.name] ?? ""),
        expected[law.name],
      );
    }
    assertEquals(accent.shadows, mono.shadows);
  }
});

Deno.test("appearance scope CSS is symmetric, rooted, and zero-specificity", () => {
  assertEquals(appearanceProjections, ["mono", "accent"]);
  assertEquals(
    accentScopeAttributeSelector("accent"),
    `[${ACCENT_ATTRIBUTE}]:not([${ACCENT_ATTRIBUTE}="${ACCENT_NONE_VALUE}"])`,
  );
  assertEquals(
    accentScopeAttributeSelector("mono"),
    `[${ACCENT_ATTRIBUTE}="${ACCENT_NONE_VALUE}"]`,
  );
  for (const projection of appearanceProjections) {
    const attribute = accentScopeAttributeSelector(projection);
    assertStringIncludes(
      appearanceScopeCss,
      `:where([data-discern-root]${attribute}, [data-discern-root] ${attribute})`,
    );
  }
  for (const line of appearanceScopeCss.split("\n")) {
    const value = line.trim();
    if (value.includes(ACCENT_ATTRIBUTE) && value.endsWith("{")) {
      assert(value.startsWith(":where("), value);
      assert(value.includes("[data-discern-root]"), value);
    }
  }
  for (const law of [...appearanceColorRoleLaws, ...appearanceShadowRoleLaws]) {
    assertStringIncludes(appearanceScopeCss, `${law.name}:`);
  }
});

Deno.test("runtime emits appearance scopes only when selected", async () => {
  const plain = await Deno.makeTempDir();
  const first = await Deno.makeTempDir();
  const second = await Deno.makeTempDir();
  try {
    const plainSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${plain}/`),
      components: ["button"],
    });
    assertEquals(plainSummary.manifest.selection.appearanceScopes, false);
    assert(
      !(await Deno.readTextFile(join(plain, "discern.css"))).includes(
        ACCENT_ATTRIBUTE,
      ),
    );

    const firstSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${first}/`),
      components: ["button"],
      appearanceScopes: true,
    });
    const secondSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${second}/`),
      components: ["button"],
      appearanceScopes: true,
    });
    assertEquals(firstSummary.manifest.selection.appearanceScopes, true);
    assertEquals(firstSummary.manifest, secondSummary.manifest);
    assertEquals(
      await Deno.readFile(join(first, "discern.css")),
      await Deno.readFile(join(second, "discern.css")),
    );
    const css = await Deno.readTextFile(join(first, "discern.css"));
    assertStringIncludes(css, ACCENT_ATTRIBUTE);
    assertStringIncludes(css, "--discern-accent-hue");
  } finally {
    await Deno.remove(plain, { recursive: true });
    await Deno.remove(first, { recursive: true });
    await Deno.remove(second, { recursive: true });
  }
});
