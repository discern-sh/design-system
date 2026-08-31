import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { Card } from "../../display/card/card.tsx";
import meta, { componentExampleVocabulary } from "./masonry.meta.ts";
import { Masonry } from "./masonry.tsx";

export const conformance = [{
  example: "default",
  name: "variable-height peers occupy multiple wide columns",
  viewport: { width: 1440, height: 1000 },
  steps: [{
    expect: "x-position-count",
    target: {
      selector: "[data-example-masonry] > .discern-masonry__item",
    },
    minimum: 2,
  }, {
    expect: "contained-x",
    target: { selector: "[data-example-masonry]" },
  }],
}, {
  example: "default",
  name: "variable-height peers collapse to one narrow column",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "x-position-count",
    target: {
      selector: "[data-example-masonry] > .discern-masonry__item",
    },
    minimum: 1,
    maximum: 1,
  }, {
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
  {
    title: "A practical constraint",
    paragraphs: [
      "Every card keeps the height its content actually needs.",
      "Nothing is stretched merely to complete an artificial row.",
    ],
  },
  {
    title: "A quick signal",
    paragraphs: ["Brief material can stay brief."],
  },
  {
    title: "A deeper thread",
    paragraphs: [
      "Longer material receives enough room to remain useful.",
      "Its neighbours continue independently in their own columns.",
      "The uneven edges make that difference in natural height visible.",
      "Reading order remains the authored order in the document.",
    ],
  },
  {
    title: "A measured outcome",
    paragraphs: [
      "Repeated variation creates a recognisable masonry rhythm.",
      "The composition remains responsive without measuring cards in JavaScript.",
    ],
  },
  {
    title: "A closing note",
    paragraphs: ["One final compact peer completes the collection."],
  },
] as const;

function masonryCards(entries: readonly (typeof items)[number][]) {
  return entries.map((item) => (
    <Card key={item.title} raised>
      <h3>{item.title}</h3>
      {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </Card>
  ));
}

function DefaultMasonryState() {
  return (
    <Masonry minimum="14rem" gap={4} data-example-masonry>
      {masonryCards(items.slice(0, 4))}
    </Masonry>
  );
}

function SingleColumnMasonryState() {
  return (
    <Masonry minimum="100%" gap={4}>
      {items.slice(0, 3).map((item) => (
        <Card key={item.title} raised>
          <h3>{item.title}</h3>
          <p>{item.paragraphs[0]}</p>
        </Card>
      ))}
    </Masonry>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultMasonryState },
    { id: "single-column", Example: SingleColumnMasonryState },
  ],
);

export default function MasonryExamples() {
  return <DefaultMasonryState />;
}
