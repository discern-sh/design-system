import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { overflowCueMarkupAttributes } from "../../../internal/overflow-cue-state.js";
import meta, { componentExampleVocabulary } from "./overflow-cue.meta.ts";
import { OverflowCue } from "./overflow-cue.tsx";
import type { OverflowCueAxis } from "./overflow-cue.tsx";

type ScrollPosture = "start" | "middle" | "end";

const viewportStyle = {
  inlineSize: "min(100%, 19rem)",
  blockSize: "10rem",
} satisfies CSSProperties;

const horizontalStyle = {
  inlineSize: "min(100%, 19rem)",
} satisfies CSSProperties;

const verticalItems = Array.from(
  { length: 12 },
  (_, index) => `Item ${index + 1}`,
);

const horizontalItems = Array.from(
  { length: 7 },
  (_, index) => `Item ${index + 1}`,
);

function useInitialScrollPosition(
  axis: OverflowCueAxis,
  posture: ScrollPosture,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      const target = root?.querySelector<HTMLElement>(
        `[${overflowCueMarkupAttributes.target}]`,
      );
      if (target === undefined || target === null) return;
      const ratio = posture === "start" ? 0 : posture === "middle" ? 0.5 : 1;
      if (axis === "block" || axis === "both") {
        target.scrollTop = (target.scrollHeight - target.clientHeight) * ratio;
      }
      if (axis === "inline" || axis === "both") {
        const maximum = target.scrollWidth - target.clientWidth;
        target.scrollLeft = getComputedStyle(target).direction === "rtl"
          ? -maximum * ratio
          : maximum * ratio;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [axis, posture]);
  return rootRef;
}

function VerticalState({ posture }: { readonly posture: ScrollPosture }) {
  const ref = useInitialScrollPosition("block", posture);
  return (
    <OverflowCue
      ref={ref}
      axis="block"
      style={viewportStyle}
      viewportLabel={`Vertical overflow at ${posture}`}
    >
      <ol className="discern-example-stack" style={{ margin: 0 }}>
        {verticalItems.map((item) => <li key={item}>{item}</li>)}
      </ol>
    </OverflowCue>
  );
}

function HorizontalState({ posture }: { readonly posture: ScrollPosture }) {
  const ref = useInitialScrollPosition("inline", posture);
  return (
    <OverflowCue
      ref={ref}
      axis="inline"
      style={horizontalStyle}
      viewportLabel={`Horizontal overflow at ${posture}`}
    >
      <div
        className="discern-example-row"
        style={{ flexWrap: "nowrap", inlineSize: "max-content" }}
      >
        {horizontalItems.map((item) => (
          <div
            className="discern-layout-sample"
            style={{ inlineSize: "8rem" }}
            key={item}
          >
            {item}
          </div>
        ))}
      </div>
    </OverflowCue>
  );
}

function BothAxesState() {
  const ref = useInitialScrollPosition("both", "middle");
  return (
    <OverflowCue
      ref={ref}
      axis="both"
      style={viewportStyle}
      viewportLabel="Overflow on both axes"
    >
      <div
        className="discern-example-grid"
        style={{ inlineSize: "38rem" }}
      >
        {verticalItems.map((item) => (
          <div className="discern-layout-sample" key={item}>{item}</div>
        ))}
      </div>
    </OverflowCue>
  );
}

function DynamicContentState() {
  const [expanded, setExpanded] = useState(false);
  const [tall, setTall] = useState(false);
  const items = verticalItems.slice(0, expanded ? 12 : 3);
  return (
    <div
      className="discern-example-stack"
      style={{ inlineSize: "min(100%, 20rem)" }}
    >
      <div className="discern-example-row">
        <button
          className="discern-text-trigger"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Reduce content" : "Add content"}
        </button>
        <button
          className="discern-text-trigger"
          type="button"
          onClick={() => setTall((value) => !value)}
        >
          {tall ? "Use compact size" : "Increase size"}
        </button>
      </div>
      <OverflowCue
        axis="block"
        style={{ blockSize: tall ? "14rem" : "9rem" }}
        viewportLabel="Dynamic overflow example"
      >
        <ol className="discern-example-stack" style={{ margin: 0 }}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </OverflowCue>
    </div>
  );
}

function RtlInlineState() {
  const ref = useInitialScrollPosition("inline", "middle");
  return (
    <OverflowCue
      ref={ref}
      axis="inline"
      dir="rtl"
      style={horizontalStyle}
      viewportLabel="Right-to-left inline overflow"
    >
      <div
        className="discern-example-row"
        style={{ flexWrap: "nowrap", inlineSize: "max-content" }}
      >
        {horizontalItems.map((item) => (
          <div
            className="discern-layout-sample"
            style={{ inlineSize: "8rem" }}
            key={item}
          >
            {item}
          </div>
        ))}
      </div>
    </OverflowCue>
  );
}

function NoOverflowState() {
  return (
    <OverflowCue
      axis="both"
      style={{ inlineSize: "min(100%, 19rem)", blockSize: "8rem" }}
      viewportLabel="Content that fits"
    >
      <div className="discern-example-stack">
        <div className="discern-layout-sample">Item 1</div>
        <div className="discern-layout-sample">Item 2</div>
      </div>
    </OverflowCue>
  );
}

export const conformance = [
  {
    example: "vertical-start",
    name: "keyboard scrolling updates the remaining block edges",
    steps: [
      {
        action: "focus",
        target: { selector: "[data-discern-overflow-cue-target]" },
      },
      { action: "press", key: "End" },
      {
        expect: "attribute",
        target: { selector: "[data-discern-overflow-cue]" },
        attribute: "data-discern-overflow-cue-block-start",
        value: "true",
      },
      {
        expect: "attribute",
        target: { selector: "[data-discern-overflow-cue]" },
        attribute: "data-discern-overflow-cue-block-end",
        value: "false",
      },
    ],
  },
  {
    example: "dynamic-content",
    name: "content growth updates overflow without a consumer sync call",
    steps: [
      { action: "click", target: { role: "button", name: "Add content" } },
      {
        expect: "attribute",
        target: { selector: "[data-discern-overflow-cue]" },
        attribute: "data-discern-overflow-cue-block-end",
        value: "true",
      },
    ],
  },
] satisfies readonly ConformanceScenario[];

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "vertical-start", Example: () => <VerticalState posture="start" /> },
    {
      id: "vertical-middle",
      Example: () => <VerticalState posture="middle" />,
    },
    { id: "vertical-end", Example: () => <VerticalState posture="end" /> },
    {
      id: "horizontal-start",
      Example: () => <HorizontalState posture="start" />,
    },
    {
      id: "horizontal-middle",
      Example: () => <HorizontalState posture="middle" />,
    },
    {
      id: "horizontal-end",
      Example: () => <HorizontalState posture="end" />,
    },
    { id: "both-axes", Example: BothAxesState },
    { id: "dynamic-content", Example: DynamicContentState },
    { id: "rtl-inline", Example: RtlInlineState },
    { id: "no-overflow", Example: NoOverflowState },
  ],
);

export default function OverflowCueExamples() {
  return <VerticalState posture="start" />;
}
