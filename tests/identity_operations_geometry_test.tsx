import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  AgentAvatar,
  AgentMention,
  AgentPersona,
  Avatar,
  AvatarGroup,
  Fleet,
  Mention,
  Persona,
  Transcript,
  VerificationReport,
  Worklog,
} from "../src/react.ts";
import {
  denseFleetRows,
  denseTranscriptTurns,
  denseVerificationReport,
  denseWorklogEntries,
} from "../src/components/agents/operational-examples.ts";

const longName = "Alexandrine Featherstonehaugh-Cholmondeley";
const statuses = ["working", "waiting", "blocked", "done", "idle"] as const;

async function withRuntime(
  run: (page: Page, css: string) => Promise<void>,
): Promise<void> {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["People", "Agents"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await run(page, css);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
}

async function render(
  page: Page,
  css: string,
  theme: string,
  sections: readonly { readonly width: number; readonly markup: string }[],
): Promise<void> {
  await page.setContent(
    `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><body>${
      sections.map(({ width, markup }, index) =>
        `<section data-case="${index}" style="width:${width}px">${markup}</section>`
      ).join("")
    }</body></html>`,
  );
}

Deno.test("grouped monograms keep clear of the disc that overlaps them", async () => {
  await withRuntime(async (page, css) => {
    const names = ["Morgan Ellis", "June Park", "Ada Osei", "Wren Mbeki"];
    for (const theme of ["light", "dark"]) {
      await render(
        page,
        css,
        theme,
        (["sm", "md", "lg", "xl"] as const).map((size) => ({
          width: 720,
          markup: renderToStaticMarkup(
            <AvatarGroup max={3} label={`Contributors ${size}`} size={size}>
              {names.map((name) => (
                <Avatar key={name} name={name} size={size} />
              ))}
            </AvatarGroup>,
          ),
        })),
      );
      const facts = await page.locator(".discern-avatar-group").evaluateAll(
        (groups) =>
          groups.flatMap((group) => {
            const items = [...group.children] as HTMLElement[];
            return items.slice(0, -1).map((item, index) => {
              const monogram = item.querySelector(".discern-avatar__monogram")!;
              const range = document.createRange();
              range.selectNodeContents(monogram);
              const ring = Number.parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              ) * 0.125;
              return {
                text: monogram.textContent,
                clearance: items[index + 1]!.getBoundingClientRect().left -
                  ring - range.getBoundingClientRect().right,
              };
            });
          }),
      );
      for (const { text, clearance } of facts) {
        assert(
          clearance >= 1,
          `${theme}: ${text} runs ${clearance.toFixed(2)}px into the next disc`,
        );
      }
      const overflow = await page.locator(".discern-avatar-group__overflow")
        .evaluateAll((chips) =>
          chips.map((chip) => {
            const style = getComputedStyle(chip);
            return {
              color: style.backgroundColor,
              image: style.backgroundImage,
            };
          })
        );
      assertEquals(overflow.length, 4);
      for (const { color, image } of overflow) {
        const layers = image === "none" ? [color] : [
          ...image.matchAll(/(?:rgba?|oklch|oklab|color)\([^()]*\)/g),
        ].map((match) =>
          match[0]
        );
        assert(layers.length > 0, `${theme}: overflow chip paints no fill`);
        for (const layer of layers) {
          assert(
            !/\/\s*0?\.\d+\)$|,\s*0?\.\d+\)$|,\s*0\)$/.test(layer),
            `${theme}: overflow chip fill ${layer} lets the next disc show through`,
          );
        }
      }
    }
  });
});

Deno.test("agent status badges stay opaque and differ by shape, not colour alone", async () => {
  await withRuntime(async (page, css) => {
    for (const theme of ["light", "dark"]) {
      await render(page, css, theme, [{
        width: 720,
        markup: renderToStaticMarkup(
          <>
            {(["sm", "md", "xl"] as const).flatMap((size) =>
              statuses.map((status) => (
                <AgentAvatar
                  key={`${size}-${status}`}
                  name="forge-2"
                  size={size}
                  status={status}
                />
              ))
            )}
          </>,
        ),
      }]);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const badges = await page.locator(".discern-agent-avatar__status")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const style = getComputedStyle(node);
            const after = getComputedStyle(node, "::after");
            const before = getComputedStyle(node, "::before");
            const strip = (value: string) =>
              value.replace(/(?:rgba?|oklch|oklab|color)\([^()]*\)/g, "C");
            const tile = node.parentElement!.getBoundingClientRect();
            const badge = node.getBoundingClientRect();
            return {
              status: (node as HTMLElement).dataset.discernAvatarStatus!,
              underlay: style.backgroundColor,
              shape: [
                strip(style.backgroundImage),
                style.backgroundSize,
                style.borderColor === "rgba(0, 0, 0, 0)" ? "edgeless" : "edged",
                after.content,
              ].join(" | "),
              text: node.textContent,
              animation: style.animationName,
              pulse: before.animationName,
              share: badge.width / tile.width,
            };
          })
        );
      assertEquals(badges.length, 15);
      for (const badge of badges) {
        assert(
          !/\/\s*0?\.\d+\)$|,\s*0?\.\d+\)$/.test(badge.underlay),
          `${theme}: ${badge.status} badge underlay ${badge.underlay} is translucent`,
        );
        assertEquals(badge.text, "", "Badge marks are drawn, not typeset");
        assertEquals(
          badge.animation,
          "none",
          `${theme}: ${badge.status} badge must not fade its own underlay`,
        );
        assert(badge.share <= 0.3, `${badge.status} badge covers the tile`);
      }
      const working = badges.filter(({ status }) => status === "working");
      assert(working.every(({ pulse }) => pulse !== "none"));
      const shapes = new Map<string, string>();
      for (const { status, shape } of badges.slice(0, statuses.length)) {
        assert(
          !shapes.has(shape),
          `${theme}: ${status} shares the ${shapes.get(shape)} badge shape`,
        );
        shapes.set(shape, status);
      }
    }
  });
});

Deno.test("identity marks sit beside the first line of a wrapped name", async () => {
  await withRuntime(async (page, css) => {
    for (const theme of ["light", "dark"]) {
      await render(page, css, theme, [
        {
          width: 220,
          markup: renderToStaticMarkup(
            <Persona name={longName} detail="Research programme lead" />,
          ),
        },
        {
          width: 220,
          markup: renderToStaticMarkup(
            <AgentPersona
              name="terminal-contract-audit-with-identities"
              status="working"
            />,
          ),
        },
        {
          width: 160,
          markup: renderToStaticMarkup(<Mention name={longName} href="#a" />),
        },
        {
          width: 160,
          markup: renderToStaticMarkup(
            <AgentMention name="terminal-contract-audit" />,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(<Persona name="Ada Osei" />),
        },
      ]);
      const facts = await page.locator("section[data-case]").evaluateAll((
        sections,
      ) =>
        sections.map((section) => {
          const root = section.firstElementChild!;
          const mark = root.firstElementChild!.getBoundingClientRect();
          const name = root.querySelector(
            '[class$="__name"]',
          )!;
          const range = document.createRange();
          range.selectNodeContents(name);
          const lines = [...range.getClientRects()];
          const first = lines[0]!;
          return {
            lines: new Set(lines.map((line) => Math.round(line.top))).size,
            markTop: mark.top,
            markCentre: mark.top + mark.height / 2,
            textTop: first.top,
            nameCentre: first.top + first.height / 2,
          };
        })
      );
      for (const [index, fact] of facts.slice(0, 4).entries()) {
        assert(fact.lines > 1, `case ${index} must wrap to test alignment`);
        assert(
          fact.markTop <= fact.textTop + 4 &&
            Math.abs(fact.markCentre - fact.nameCentre) <
              Math.max(fact.markCentre - fact.markTop, 12),
          `${theme}: case ${index} mark drifts away from the first line`,
        );
      }
      const single = facts[4]!;
      assert(
        Math.abs(single.markCentre - single.nameCentre) < 1,
        `${theme}: a one-line Persona keeps its text centred on the avatar`,
      );
    }
  });
});

Deno.test("operational evidence keeps words, stamps, and columns whole at narrow widths", async () => {
  await withRuntime(async (page, css) => {
    for (const theme of ["light", "dark"]) {
      await render(page, css, theme, [
        {
          width: 720,
          markup: renderToStaticMarkup(<Fleet rows={denseFleetRows} />),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <Transcript turns={denseTranscriptTurns} />,
          ),
        },
        {
          width: 720,
          markup: renderToStaticMarkup(
            <Transcript turns={denseTranscriptTurns} />,
          ),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <VerificationReport {...denseVerificationReport} evidenceOpen />,
          ),
        },
        {
          width: 352,
          markup: renderToStaticMarkup(
            <VerificationReport
              title="Checkout refactor"
              stamp="pass"
              checks={[
                { label: "format", state: "pass" },
                { label: "tests", state: "pass", value: "184 passed" },
              ]}
            />,
          ),
        },
        {
          width: 390,
          markup: renderToStaticMarkup(
            <Worklog entries={denseWorklogEntries} />,
          ),
        },
      ]);
      const facts = await page.evaluate(() => {
        const lineCount = (node: Node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const middles = [...range.getClientRects()]
            .filter((rect) => rect.width > 0)
            .map((rect) => rect.top + rect.height / 2)
            .toSorted((a, b) => a - b);
          return middles.filter((middle, index) =>
            index === 0 || middle - middles[index - 1]! > 6
          ).length;
        };
        const columns = ["persona", "branch", "state", "drift", "meta"].map(
          (column) => {
            const edges = [
              ...document.querySelectorAll(`.discern-fleet__${column}`),
            ].map((node) => {
              const rect = node.getBoundingClientRect();
              return getComputedStyle(node).justifySelf === "end"
                ? rect.right
                : rect.left;
            });
            return {
              column,
              spread: Math.max(...edges) - Math.min(...edges),
              count: edges.length,
            };
          },
        );
        const asides = [
          ...document.querySelectorAll(".discern-transcript__aside"),
        ].map((node) => ({ text: node.textContent, lines: lineCount(node) }));
        const textIndents = [
          ...document.querySelectorAll(".discern-transcript__turn"),
        ].flatMap((turn) => {
          const name = turn.querySelector(
            ".discern-transcript__name:not(.discern-visually-hidden)",
          );
          if (name === null) return [];
          return [
            turn.querySelector(".discern-transcript__body")!
              .getBoundingClientRect().left -
            name.getBoundingClientRect().left,
          ];
        });
        const summaries = [
          ...document.querySelectorAll(
            ".discern-verification-report__evidence > summary",
          ),
        ].map((summary) => {
          const label = [...summary.childNodes].find((node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim() !== ""
          );
          return {
            display: getComputedStyle(summary).display,
            lines: label === undefined ? 0 : lineCount(label),
          };
        });
        const verdicts = [
          ...document.querySelectorAll(".discern-verification-report__verdict"),
        ].map((node) => ({ text: node.textContent, lines: lineCount(node) }));
        const stacked = [
          ...document.querySelectorAll(
            ".discern-verification-report__checks > div",
          ),
        ].flatMap((row) => {
          const term = row.querySelector("dt")!.getBoundingClientRect();
          const value = row.querySelector("dd")!.getBoundingClientRect();
          return value.top >= term.bottom - 1
            ? [Math.abs(value.left - term.left)]
            : [];
        });
        const rail = [...document.querySelectorAll(".discern-worklog__entry")]
          .flatMap((entry) => {
            if (entry.getAttribute("data-discern-routine") !== "continuation") {
              return [];
            }
            const marker = entry.querySelector(".discern-worklog__marker")!;
            return [getComputedStyle(marker).backgroundImage];
          });
        return {
          columns,
          asides,
          textIndents,
          summaries,
          verdicts,
          stacked,
          rail,
        };
      });
      for (const { column, spread, count } of facts.columns) {
        assert(count > 1, `Fleet renders several ${column} cells`);
        assert(spread < 0.5, `${theme}: Fleet ${column} shifts ${spread}px`);
      }
      assert(facts.asides.length > 0);
      for (const aside of facts.asides) {
        assertEquals(aside.lines, 1, `${theme}: "${aside.text}" wraps`);
      }
      assert(facts.textIndents.length > 0);
      for (const indent of facts.textIndents) {
        assert(
          Math.abs(indent) < 1,
          `${theme}: a text speaker's body hangs ${indent}px from its name`,
        );
      }
      assertEquals(facts.summaries.length, 2);
      for (const summary of facts.summaries) {
        assert(summary.display !== "list-item", "native marker stays hidden");
        assertEquals(summary.lines, 1, `${theme}: Evidence breaks mid-word`);
      }
      assert(facts.verdicts.length > 0);
      for (const verdict of facts.verdicts) {
        assertEquals(
          verdict.lines,
          1,
          `${theme}: "${verdict.text}" splits its glyph from its word`,
        );
      }
      assert(facts.stacked.length > 0, "narrow evidence rows stack");
      for (const offset of facts.stacked) {
        assert(offset < 1, `${theme}: a stacked value staircases ${offset}px`);
      }
      assert(facts.rail.length > 0);
      for (const image of facts.rail) {
        assert(
          image !== "none",
          `${theme}: a continuation marker breaks the rail`,
        );
      }
    }
  });
});
