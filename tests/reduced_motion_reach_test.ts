import { assertEquals } from "@std/assert";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
  matchingCssBlockEnd,
  stripCssComments,
} from "../scripts/css-syntax.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";

/**
 * The foundation's reduced-motion rule reaches elements, ::before, and
 * ::after. Any other pseudo-element that moves must settle in its own
 * stylesheet's reduced-motion block.
 */
const UNREACHED_PSEUDO = /::(?!before\b|after\b)[-a-z]+/u;
const REDUCED_MOTION =
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/gu;

function moves(block: string): boolean {
  return cssDeclarations(block).some(({ name, value }) =>
    /^(?:transition|animation)(?:-name|-duration)?$/u.test(name) &&
    !/^(?:none|0m?s)(?:\s*,\s*(?:none|0m?s))*$/u.test(value.trim())
  );
}

function settles(block: string): boolean {
  return cssDeclarations(block).some(({ name, value }) =>
    /^(?:transition|animation)(?:-duration)?$/u.test(name) &&
    /^(?:none|0m?s)$/u.test(value.trim())
  );
}

function normalized(selector: string): string {
  return selector.replaceAll(/\s+/gu, " ").trim();
}

/** Moving pseudo-element rules that reduced motion would leave running. */
function unsettledPseudoMotion(source: string): readonly string[] {
  const css = stripCssComments(source).css;
  const reduced: string[] = [];
  let ordinary = "";
  let cursor = 0;
  for (const match of css.matchAll(REDUCED_MOTION)) {
    const open = match.index + match[0].length - 1;
    const close = matchingCssBlockEnd(css, open) ?? css.length;
    ordinary += css.slice(cursor, match.index);
    reduced.push(css.slice(open + 1, close));
    cursor = close + 1;
  }
  ordinary += css.slice(cursor);
  const settled = new Set(
    reduced.flatMap((block) =>
      cssQualifiedRuleBlocks(block).rules
        .filter((rule) => settles(rule.block))
        .flatMap((rule) => rule.selector.split(",").map(normalized))
    ),
  );
  return cssQualifiedRuleBlocks(ordinary).rules
    .filter((rule) => moves(rule.block))
    .flatMap((rule) => rule.selector.split(",").map(normalized))
    .filter((selector) => UNREACHED_PSEUDO.test(selector))
    .filter((selector) => !settled.has(selector));
}

Deno.test("every moving pseudo-element the foundation cannot reach settles under reduced motion", () => {
  assertEquals(
    unsettledPseudoMotion(`
      .discern-fresh details::details-content { transition: block-size 1s; }
      .discern-fresh::before { transition: opacity 1s; }
      .discern-fresh-settled::backdrop { animation: discern-enter 1s; }
      @media (prefers-reduced-motion: reduce) {
        .discern-fresh-settled::backdrop { animation: none; }
      }
    `),
    [".discern-fresh details::details-content"],
    "the fresh unsettled fixture escaped the detector",
  );
  assertEquals(
    componentRegistry.flatMap(({ meta, css }) =>
      unsettledPseudoMotion(css).map((selector) => `${meta.slug}::${selector}`)
    ),
    [],
    "a pseudo-element keeps moving under reduced motion",
  );
});
