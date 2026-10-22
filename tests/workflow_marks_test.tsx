import { assert, assertEquals, assertMatch } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cssDeclarations,
  cssQualifiedRuleBlocks,
  matchingCssBlockEnd,
  stripCssComments,
} from "../scripts/css-syntax.ts";
import { getGlyph } from "../src/glyphs/mod.ts";
import { AgentHandoff } from "../src/components/workflow/agent-handoff/agent-handoff.tsx";
import { Command } from "../src/components/workflow/command/command.tsx";
import { DestructiveActionNotice } from "../src/components/workflow/destructive-action-notice/destructive-action-notice.tsx";
import { Diagnostic } from "../src/components/workflow/diagnostic/diagnostic.tsx";
import { PathReference } from "../src/components/workflow/path-reference/path-reference.tsx";
import { ResultSummary } from "../src/components/workflow/result-summary/result-summary.tsx";

const WORKFLOW_ROOT = fromFileUrl(
  new URL("../src/components/workflow/", import.meta.url),
);

async function workflowFiles(suffix: string): Promise<readonly string[]> {
  const files: string[] = [];
  for await (const group of Deno.readDir(WORKFLOW_ROOT)) {
    if (!group.isDirectory) continue;
    for await (const entry of Deno.readDir(join(WORKFLOW_ROOT, group.name))) {
      if (entry.isFile && entry.name.endsWith(suffix)) {
        files.push(join(WORKFLOW_ROOT, group.name, entry.name));
      }
    }
  }
  return files.toSorted();
}

const terminalGlyphImport =
  /from\s+["'][^"']*\/cli\/(?:terminal-glyphs|triangles)\.ts["']/u;
const literalStateGlyph = /[•←-⇿⌀-➿⬀-⯿]/u;

function borrowedTerminalMarks(source: string): readonly string[] {
  return [
    ...(terminalGlyphImport.test(source) ? ["terminal glyph import"] : []),
    ...[...source.matchAll(new RegExp(literalStateGlyph, "gu"))].map(
      ([glyph]) => `literal ${glyph}`,
    ),
  ];
}

Deno.test("Workflow web marks come from the Workflow, Feedback and glyph authorities", async () => {
  assertEquals(
    borrowedTerminalMarks(
      'import { TERMINAL_GLYPHS } from "../../../cli/terminal-glyphs.ts";\nconst waiting = "◷";',
    ),
    ["terminal glyph import", "literal ◷"],
  );
  const failures: string[] = [];
  for (const file of await workflowFiles(".tsx")) {
    if (file.endsWith(".examples.tsx")) continue;
    for (
      const failure of borrowedTerminalMarks(await Deno.readTextFile(file))
    ) {
      failures.push(`${relative(WORKFLOW_ROOT, file)}: ${failure}`);
    }
  }
  assertEquals(failures, []);
});

Deno.test("Workflow state pills wear the system Badge in its tone", () => {
  const cases = [
    [
      createElement(Diagnostic, {
        title: "Type check failed",
        impact: "The package cannot be built.",
        correction: "Handle the missing case.",
      }),
      "danger",
      "discern-diagnostic__severity",
    ],
    [
      createElement(Diagnostic, {
        severity: "attention",
        title: "Generated output is stale",
        impact: "The derived surface may be out of date.",
        correction: "Regenerate the derived files.",
      }),
      "warning",
      "discern-diagnostic__severity",
    ],
    [
      createElement(DestructiveActionNotice, {
        scope: "The directory.",
        impact: "Its contents are removed.",
        recovery: "Restore from backup.",
      }),
      "warning",
      "discern-destructive-action-notice__chip",
    ],
    [
      createElement(DestructiveActionNotice, {
        tone: "danger",
        scope: "The directory.",
        impact: "Its contents are replaced.",
        recovery: "Create a copy first.",
      }),
      "danger",
      "discern-destructive-action-notice__chip",
    ],
    [
      createElement(ResultSummary, { state: "failed", fact: "Two failed." }),
      "danger",
      "discern-result-summary__state",
    ],
  ] as const;
  for (const [element, tone, pill] of cases) {
    assertMatch(
      renderToStaticMarkup(element),
      new RegExp(
        `class="discern-badge discern-badge--${tone} ${pill}"[^>]*><span class="[^"]+__mark" aria-hidden="true"><svg\\b`,
        "u",
      ),
    );
  }
});

Deno.test("Workflow pill hooks never restate the Badge recipe", async () => {
  const pillHooks =
    /\.discern-(?:diagnostic__severity|destructive-action-notice__chip|result-summary__state)\b/u;
  const recipe = new Set([
    "padding",
    "padding-block",
    "padding-inline",
    "border",
    "border-radius",
    "background",
    "min-block-size",
  ]);
  const failures: string[] = [];
  for (const file of await workflowFiles(".css")) {
    const { rules } = cssQualifiedRuleBlocks(await Deno.readTextFile(file));
    for (const rule of rules) {
      if (!pillHooks.test(rule.selector)) continue;
      for (const { name } of cssDeclarations(rule.block)) {
        if (recipe.has(name)) {
          failures.push(`${relative(WORKFLOW_ROOT, file)}: ${rule.selector}`);
        }
      }
    }
  }
  assertEquals(failures, []);
});

Deno.test("Activity log mark and status word read one status tone", async () => {
  const css = await Deno.readTextFile(
    join(WORKFLOW_ROOT, "activity-log", "activity-log.css"),
  );
  const { rules } = cssQualifiedRuleBlocks(css);
  const colourOf = (selector: string): readonly string[] =>
    rules.filter((rule) => rule.selector === selector).flatMap((rule) =>
      cssDeclarations(rule.block).filter(({ name }) => name === "color")
        .map(({ value }) => value)
    );
  for (const part of ["marker", "status"]) {
    const colours = colourOf(`.discern-activity-log__${part}`);
    assertEquals(colours.length, 1, `${part} declares one base colour`);
    assertMatch(colours[0] ?? "", /^var\(--discern-activity-log-tone,/u);
  }
  assert(
    !rules.some((rule) =>
      /data-discern-status=.*\.discern-activity-log__status/u.test(
        rule.selector,
      )
    ),
    "a per-status word colour would let the word drift from its mark",
  );
});

Deno.test("every Workflow copy control leads with the copy glyph", () => {
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(Command, { command: "deno task test" }),
      createElement(PathReference, { path: "src/mod.ts", copyable: true }),
      createElement(AgentHandoff, { title: "Hand off", children: "Do it." }),
      createElement(ResultSummary, {
        state: "passed",
        fact: "Passed.",
        machineReadable: '{"ok":true}',
      }),
    ),
  );
  const buttons = html.match(/<button\b[^>]*discern-copy-button/gu) ?? [];
  assertEquals(buttons.length, 4);
  const icons = html.match(
    new RegExp(
      `class="discern-copy-button__icon"[^>]*>${getGlyph("copy").unicode}<`,
      "gu",
    ),
  ) ?? [];
  assertEquals(icons.length, buttons.length);
});

function maskDeclarations(css: string): number {
  return cssQualifiedRuleBlocks(css).rules.flatMap((rule) =>
    cssDeclarations(rule.block).filter(({ name }) => name === "mask")
  ).length;
}

function scrollDrivenBlocks(css: string): string {
  const prelude = "@supports (animation-timeline: scroll())";
  const blocks: string[] = [];
  let start = css.indexOf(prelude);
  while (start >= 0) {
    const open = css.indexOf("{", start);
    const end = matchingCssBlockEnd(css, open);
    assert(end !== undefined, "unterminated @supports block");
    blocks.push(css.slice(open + 1, end));
    start = css.indexOf(prelude, end);
  }
  return blocks.join("\n");
}

Deno.test("Workflow scroll wells fade their end only while a scroll timeline drives it", async () => {
  for (
    const [slug, scroller] of [
      ["command", "discern-command__text"],
      ["expected-result", "discern-expected-result__output"],
      ["raw-output", "discern-raw-output__content"],
    ] as const
  ) {
    const css = stripCssComments(
      await Deno.readTextFile(join(WORKFLOW_ROOT, slug, `${slug}.css`)),
    ).css;
    const supported = scrollDrivenBlocks(css);
    assert(maskDeclarations(css) > 0, `${slug} fades its overflow`);
    assertEquals(
      maskDeclarations(supported),
      maskDeclarations(css),
      `${slug} masks outside @supports, so engines without scroll timelines fade forever`,
    );
    assertMatch(
      supported,
      new RegExp(`\\.${scroller}:not\\(:focus-visible\\)`),
    );
    assertMatch(
      css,
      new RegExp(
        `@keyframes discern-${slug}-overflow\\s*\\{\\s*from\\s*\\{\\s*mask-position:\\s*100% 0;\\s*\\}\\s*\\}`,
        "u",
      ),
      `${slug} must fade from the start state so an inactive timeline shows no fade`,
    );
  }
});

Deno.test("every Workflow container name has a query that reads it", async () => {
  const failures: string[] = [];
  for (const file of await workflowFiles(".css")) {
    const css = await Deno.readTextFile(file);
    for (const [, name] of css.matchAll(/container:\s*([\w-]+)\s*\//gu)) {
      if (!new RegExp(`@container ${name}\\b`, "u").test(css)) {
        failures.push(`${relative(WORKFLOW_ROOT, file)}: ${name}`);
      }
    }
  }
  assertEquals(failures, []);
});

Deno.test("Workflow wells nested in a surface sit below it", async () => {
  const read = (slug: string) =>
    Deno.readTextFile(join(WORKFLOW_ROOT, slug, `${slug}.css`));
  const background = (css: string, selector: string): string | undefined =>
    cssQualifiedRuleBlocks(css).rules.filter((rule) =>
      rule.selector === selector
    ).flatMap((rule) =>
      cssDeclarations(rule.block).filter(({ name }) => name === "background")
    ).at(-1)?.value;
  assertEquals(
    background(await read("path-reference"), ".discern-path-reference__path"),
    "var(--discern-color-inset)",
  );
  assertEquals(
    background(await read("expected-result"), ".discern-expected-result"),
    "var(--discern-color-surface-sunken)",
    "a standalone Expected result is a top-level tinted panel",
  );
  assertEquals(
    background(
      await read("command"),
      ".discern-command__details > .discern-expected-result",
    ),
    "var(--discern-color-inset)",
  );
});
