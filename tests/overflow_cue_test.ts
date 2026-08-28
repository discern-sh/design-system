import { assertEquals, assertStringIncludes } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OverflowCue } from "../src/components/layout/overflow-cue/overflow-cue.tsx";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import { selectedComponentBehaviors } from "../src/internal/browser-behavior-selection.ts";
import {
  logicalInlineScrollOffset,
  measureOverflowCueState,
  overflowCueAxes,
  overflowCueMarkupAttributes,
  overflowCueStateAttributes,
} from "../src/internal/overflow-cue-state.js";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import {
  componentBehaviorOptIns,
  componentBehaviors,
} from "../src/types/component-meta.ts";

const blockMetrics = {
  scrollTop: 0,
  scrollLeft: 0,
  scrollWidth: 200,
  scrollHeight: 600,
  clientWidth: 200,
  clientHeight: 200,
  direction: "ltr",
} as const;

Deno.test("Overflow cue state follows measurable remaining distance on each selected axis", () => {
  assertEquals(overflowCueAxes, ["block", "inline", "both"]);
  assertEquals(overflowCueStateAttributes, {
    blockStart: "data-discern-overflow-cue-block-start",
    blockEnd: "data-discern-overflow-cue-block-end",
    inlineStart: "data-discern-overflow-cue-inline-start",
    inlineEnd: "data-discern-overflow-cue-inline-end",
  });

  assertEquals(measureOverflowCueState(blockMetrics, "block", "negative"), {
    blockStart: false,
    blockEnd: true,
    inlineStart: false,
    inlineEnd: false,
  });
  assertEquals(
    measureOverflowCueState(
      { ...blockMetrics, scrollTop: 200 },
      "block",
      "negative",
    ),
    {
      blockStart: true,
      blockEnd: true,
      inlineStart: false,
      inlineEnd: false,
    },
  );
  assertEquals(
    measureOverflowCueState(
      { ...blockMetrics, scrollTop: 400 },
      "block",
      "negative",
    ),
    {
      blockStart: true,
      blockEnd: false,
      inlineStart: false,
      inlineEnd: false,
    },
  );
});

Deno.test("Overflow cue normalises every RTL scrollLeft convention to logical distance", () => {
  const maximum = 300;
  const cases = [
    { type: "negative", start: 0, middle: -150, end: -300 },
    { type: "reverse", start: 0, middle: 150, end: 300 },
    { type: "default", start: 300, middle: 150, end: 0 },
  ] as const;

  for (const testCase of cases) {
    assertEquals(
      logicalInlineScrollOffset(
        testCase.start,
        maximum,
        "rtl",
        testCase.type,
      ),
      0,
    );
    assertEquals(
      logicalInlineScrollOffset(
        testCase.middle,
        maximum,
        "rtl",
        testCase.type,
      ),
      150,
    );
    assertEquals(
      logicalInlineScrollOffset(
        testCase.end,
        maximum,
        "rtl",
        testCase.type,
      ),
      300,
    );

    const metrics = {
      ...blockMetrics,
      clientWidth: 200,
      scrollWidth: 500,
      scrollHeight: 200,
      direction: "rtl",
    } as const;
    assertEquals(
      measureOverflowCueState(
        { ...metrics, scrollLeft: testCase.start },
        "inline",
        testCase.type,
      ),
      {
        blockStart: false,
        blockEnd: false,
        inlineStart: false,
        inlineEnd: true,
      },
    );
    assertEquals(
      measureOverflowCueState(
        { ...metrics, scrollLeft: testCase.middle },
        "inline",
        testCase.type,
      ),
      {
        blockStart: false,
        blockEnd: false,
        inlineStart: true,
        inlineEnd: true,
      },
    );
    assertEquals(
      measureOverflowCueState(
        { ...metrics, scrollLeft: testCase.end },
        "inline",
        testCase.type,
      ),
      {
        blockStart: false,
        blockEnd: false,
        inlineStart: true,
        inlineEnd: false,
      },
    );
  }
});

Deno.test("Overflow cue suppresses unselected axes, fitting content, and subpixel residue", () => {
  const both = {
    ...blockMetrics,
    scrollTop: 100,
    scrollLeft: 100,
    scrollWidth: 500,
    direction: "ltr",
  } as const;
  assertEquals(measureOverflowCueState(both, "both", "negative"), {
    blockStart: true,
    blockEnd: true,
    inlineStart: true,
    inlineEnd: true,
  });
  assertEquals(measureOverflowCueState(both, "block", "negative"), {
    blockStart: true,
    blockEnd: true,
    inlineStart: false,
    inlineEnd: false,
  });
  assertEquals(
    measureOverflowCueState(
      {
        ...blockMetrics,
        scrollTop: 0.25,
        scrollHeight: 200.5,
      },
      "both",
      "negative",
    ),
    {
      blockStart: false,
      blockEnd: false,
      inlineStart: false,
      inlineEnd: false,
    },
  );
});

Deno.test("Overflow cue renders one observable static and raw-HTML state contract", () => {
  const owned = renderToStaticMarkup(
    createElement(OverflowCue, {
      axis: "both",
      viewportLabel: "Scrollable evidence",
      children: createElement("p", null, "Evidence"),
    }),
  );
  assertStringIncludes(owned, `${overflowCueMarkupAttributes.root}=""`);
  assertStringIncludes(owned, `${overflowCueMarkupAttributes.target}=""`);
  assertStringIncludes(owned, 'data-discern-overflow-cue-axis="both"');
  assertStringIncludes(owned, 'aria-label="Scrollable evidence"');
  assertStringIncludes(owned, 'tabindex="0"');
  for (const attribute of Object.values(overflowCueStateAttributes)) {
    assertStringIncludes(owned, `${attribute}="false"`);
  }
  assertEquals(owned.match(/aria-hidden="true"/gu)?.length, 4);

  const descendant = renderToStaticMarkup(
    createElement(OverflowCue, {
      axis: "inline",
      scrollContainer: "descendant",
      children: createElement("div", {
        [overflowCueMarkupAttributes.target]: "",
        tabIndex: 0,
        "aria-label": "Existing scroll area",
      }, "Evidence"),
    }),
  );
  assertStringIncludes(descendant, 'aria-label="Existing scroll area"');
  assertEquals(
    descendant.match(/data-discern-overflow-cue-target=""/gu)?.length,
    1,
  );
  assertEquals(descendant.includes("discern-overflow-cue__viewport"), false);
});

Deno.test("future behavior metadata auto-enrols the selected script only", async () => {
  for (const behavior of componentBehaviors) {
    assertEquals(
      selectedComponentBehaviors([{ behaviors: [behavior] }]),
      [behavior],
      `synthetic future Component did not enrol ${behavior}`,
    );
  }

  const output = await Deno.makeTempDir();
  try {
    for (const behavior of componentBehaviors) {
      const owner = componentBehaviorOptIns[behavior][0];
      if (owner === undefined) throw new TypeError(`${behavior} has no owner`);
      const summary = await emitDesignSystemRuntime({
        outputRoot: toFileUrl(`${output}/`),
        components: [owner],
      });
      assertEquals(summary.manifest.outputs.scripts, ["discern.js"]);
      const source = await Deno.readTextFile(join(output, "discern.js"));
      assertStringIncludes(source, browserBehaviorSources[behavior].trim());
    }

    const staticSummary = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["button"],
    });
    assertEquals(staticSummary.manifest.outputs.scripts, []);
  } finally {
    await Deno.remove(output, { recursive: true });
  }
});
