import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  Blockquote,
  Callout,
  CodeBlock,
  List,
  OverflowCue,
  Paragraph,
  PullQuote,
  SiteHeader,
  Stack,
} from "../src/react.ts";

async function runtimePage(
  components: readonly string[],
): Promise<{ readonly css: string; readonly script: string }> {
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: [...components],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const script = await Deno.readTextFile(`${output}/discern.js`).catch(
      () => "",
    );
    return { css, script };
  } finally {
    await Deno.remove(output, { recursive: true });
  }
}

Deno.test("Stack owns the space between its children whatever their own margins", async () => {
  const { css } = await runtimePage([
    "stack",
    "paragraph",
    "list",
    "callout",
    "code-block",
    "blockquote",
    "pull-quote",
  ]);
  const markup = renderToStaticMarkup(
    <Stack gap={4}>
      <Paragraph>Opening paragraph.</Paragraph>
      <List items={[{ content: "One item" }]} />
      <Callout title="Note">A short callout.</Callout>
      <CodeBlock code="const ready = true;" />
      <Blockquote>
        <p>A quotation.</p>
      </Blockquote>
      <PullQuote quote="A pulled quotation." />
    </Stack>,
  );
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 900 },
    });
    await page.setContent(
      `<html data-discern-root><style>${css}</style><body>${markup}</body></html>`,
    );
    const margins = await page.locator("body > .discern-stack").evaluate((
      stack,
    ) =>
      [...stack.children].map((child) => {
        const style = getComputedStyle(child);
        return `${
          child.className.split(" ")[0]
        } ${style.marginBlockStart} ${style.marginBlockEnd}`;
      })
    );
    assertEquals(margins.length, 6);
    for (const margin of margins) {
      assert(
        margin.endsWith(" 0px 0px"),
        `a Stack child keeps its own block margin on top of the gap: ${margin}`,
      );
    }
  } finally {
    await browser.close();
  }
});

/** Every visible inline fade must cover its scrollport from edge to edge. */
const INLINE_EDGE_FACTS = `(root) => {
  const target = root.querySelector("[data-discern-overflow-cue-target]");
  const bounds = target.getBoundingClientRect();
  const portTop = bounds.top + target.clientTop;
  const portBottom = portTop + target.clientHeight;
  return [...root.querySelectorAll(":scope > [data-discern-overflow-cue-edge^='inline']")]
    .map((edge) => {
      const box = edge.getBoundingClientRect();
      return {
        edge: edge.dataset.discernOverflowCueEdge,
        visible: getComputedStyle(edge).opacity === "1",
        top: box.top - portTop,
        bottom: portBottom - box.bottom,
      };
    });
}`;

interface InlineEdgeFact {
  readonly edge: string;
  readonly visible: boolean;
  readonly top: number;
  readonly bottom: number;
}

function assertFullHeightFades(
  facts: readonly InlineEdgeFact[],
  context: string,
): void {
  for (const fact of facts.filter(({ visible }) => visible)) {
    assert(
      Math.abs(fact.top) <= 0.5 && Math.abs(fact.bottom) <= 0.5,
      `${context}: the ${fact.edge} fade leaves an unfaded band (${fact.top}px, ${fact.bottom}px)`,
    );
  }
}

Deno.test("Overflow cue inline fades span the whole scrollport so clipped items fade entirely", async () => {
  const { css, script } = await runtimePage(["overflow-cue"]);
  assert(script.length > 0, "the Overflow cue behavior was not emitted");
  const tiles = Array.from({ length: 7 }, (_, index) => (
    <div
      key={index}
      style={{ inlineSize: "8rem", blockSize: "4rem", flex: "none" }}
    >
      Item {index + 1}
    </div>
  ));
  const markup = renderToStaticMarkup(
    <OverflowCue
      axis="inline"
      style={{ inlineSize: "19rem" }}
      viewportLabel="Inline overflow"
    >
      <div style={{ display: "flex", gap: "1rem", inlineSize: "max-content" }}>
        {tiles}
      </div>
    </OverflowCue>,
  );
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 600 },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setContent(
      `<html data-discern-root><style>${css}</style><body>${markup}<script type="module">${script}</script></body></html>`,
    );
    const root = page.locator("[data-discern-overflow-cue]");
    await page.waitForFunction(() =>
      document.querySelector(
        "[data-discern-overflow-cue-inline-end='true']",
      ) !== null
    );
    await page.locator("[data-discern-overflow-cue-target]").evaluate(
      (target) => {
        target.scrollLeft = (target.scrollWidth - target.clientWidth) / 2;
      },
    );
    await page.waitForFunction(() =>
      document.querySelector(
        "[data-discern-overflow-cue-inline-start='true']",
      ) !== null
    );
    await page.waitForTimeout(50);
    const facts = await root.evaluate(
      new Function(`return ${INLINE_EDGE_FACTS}`)() as (
        root: HTMLElement,
      ) => InlineEdgeFact[],
    );
    assertEquals(
      facts.filter(({ visible }) => visible).length,
      2,
      "both inline cues should show mid-scroll",
    );
    assertFullHeightFades(facts, "owned viewport");
  } finally {
    await browser.close();
  }
});

Deno.test("a narrow Site header cues the navigation links beyond its scroll row's end", async () => {
  const { css, script } = await runtimePage(["site-header"]);
  assert(script.length > 0, "Site header no longer carries its nav cue");
  const markup = renderToStaticMarkup(
    <SiteHeader
      brand="Example brand"
      brandMark="E"
      navItems={[
        { label: "Overview", href: "#overview", current: "page" },
        { label: "Principles", href: "#principles" },
        { label: "Guides", href: "#guides" },
        { label: "Resources", href: "#resources" },
        { label: "Community", href: "#community" },
        { label: "Changelog", href: "#changelog" },
      ]}
    />,
  );
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 700 },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setContent(
      `<html data-discern-root><style>${css}</style><style>body{margin:0}</style><body>${markup}<script type="module">${script}</script></body></html>`,
    );
    await page.waitForFunction(() =>
      document.querySelector(
        ".discern-site-header [data-discern-overflow-cue-inline-end='true']",
      ) !== null
    );
    await page.waitForTimeout(50);
    const cue = page.locator(
      ".discern-site-header [data-discern-overflow-cue]",
    );
    const facts = await cue.evaluate(
      new Function(`return ${INLINE_EDGE_FACTS}`)() as (
        root: HTMLElement,
      ) => InlineEdgeFact[],
    );
    const end = facts.find(({ edge }) => edge === "inline-end");
    assert(end?.visible, "the overflowing nav shows no inline-end cue");
    assertFullHeightFades(facts, "narrow Site header");
    const reach = await cue.evaluate((root) => {
      const nav = root.querySelector(".discern-site-header__nav")!;
      const edge = root.querySelector<HTMLElement>(
        "[data-discern-overflow-cue-edge='inline-end']",
      )!;
      return nav.getBoundingClientRect().right -
        edge.getBoundingClientRect().right;
    });
    assert(
      Math.abs(reach) <= 0.5,
      `the inline-end cue stops short of the scroll row's edge (${reach}px)`,
    );
  } finally {
    await browser.close();
  }
});
