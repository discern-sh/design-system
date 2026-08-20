import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { Card } from "../../display/card/card.tsx";
import { Masonry } from "./masonry.tsx";

export const conformance = [{
  name: "variable-height peers reflow without horizontal overflow",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "contained-x",
    target: { selector: "[data-example-masonry]" },
  }],
}] satisfies readonly ConformanceScenario[];

const items = [
  {
    title: "A concise observation",
    paragraphs: ["One short supporting thought."],
  },
  {
    title: "A developed explanation",
    paragraphs: [
      "Natural content height determines this item's footprint.",
      "The next peer packs into the available lane without inventing a row.",
    ],
  },
  {
    title: "A visual note",
    paragraphs: [
      "Independent items can vary without truncation.",
      "Their DOM sequence remains unchanged.",
      "Meaning never depends on which cards happen to become neighbours.",
    ],
  },
  {
    title: "A compact aside",
    paragraphs: ["Another deliberately brief item."],
  },
  {
    title: "A final perspective",
    paragraphs: [
      "Use this rhythm for peer material rather than ordered steps or comparisons.",
      "Strict feature hierarchies belong in Feature bento.",
    ],
  },
] as const;

export default function MasonryExamples() {
  return (
    <Masonry minimum="14rem" gap={4} data-example-masonry>
      {items.map((item) => (
        <Card key={item.title} raised>
          <h3>{item.title}</h3>
          {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}
          </p>)}
        </Card>
      ))}
    </Masonry>
  );
}
