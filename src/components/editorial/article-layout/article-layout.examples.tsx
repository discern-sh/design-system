import { useId } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./article-layout.meta.ts";
import { ArticleLayout } from "./article-layout.tsx";
import { AnchorHeading } from "../../docs/anchor-heading/anchor-heading.tsx";
import { Blockquote } from "../blockquote/blockquote.tsx";
import { Callout } from "../callout/callout.tsx";
import { CodeListing } from "../code-listing/code-listing.tsx";
import { DataFigure } from "../data-figure/data-figure.tsx";
import { Footnotes } from "../footnotes/footnotes.tsx";
import { KeyPoints } from "../key-points/key-points.tsx";
import { List } from "../list/list.tsx";
import { Paragraph } from "../paragraph/paragraph.tsx";
import { Prose } from "../prose/prose.tsx";
import { PullQuote } from "../pull-quote/pull-quote.tsx";
import { TableOfContents } from "../table-of-contents/table-of-contents.tsx";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";

const observationListing = `plot: "north bed"
condition: "shade after rain"
observation: "soil remains damp"
confidence: "one visit"`;

export default function ArticleLayoutExamples() {
  const prefix = `article-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <div
      data-discern-example-article-viewport
      style={{ maxHeight: "45rem", overflow: "auto" }}
    >
      <ArticleLayout
        navigation={
          <TableOfContents
            items={[
              { label: "Context", href: `#${id("reading-context")}` },
              { label: "Method", href: `#${id("reading-method")}` },
              {
                label: "A closer look",
                href: `#${id("reading-method-detail")}`,
                nested: true,
              },
              {
                label: "Interpretation",
                href: `#${id("reading-interpretation")}`,
              },
              { label: "Notes", href: `#${id("reading-notes")}` },
            ]}
          />
        }
        rail={
          <small>
            Filed under<br />
            <strong>Practice</strong>
          </small>
        }
      >
        <Prose>
          <AnchorHeading id={id("reading-context")}>
            A reading shell with room to think.
          </AnchorHeading>
          <Paragraph>
            A field notebook is useful because it keeps an observation close to
            its circumstances. The date, the weather, and the route through a
            place can matter as much as the measurement itself. An article has a
            similar responsibility: it should carry the argument forward while
            leaving a clear route back to the evidence that supports it.
          </Paragraph>
          <Paragraph>
            Consider a small study of a shared garden. Volunteers visit the same
            plots through a growing season, record what they notice, and compare
            their notes at the end of each month. Their accounts overlap without
            being interchangeable. One person pays attention to shade; another
            notices how quickly the soil dries after rain. Reading the accounts
            together reveals a pattern that no single visit could establish.
            {" "}
            <sup>
              <a
                id={id("reading-reference-1")}
                href={`#${id("reading-source")}`}
                aria-label="See note 1, reference 1"
              >
                [1]
              </a>
            </sup>
          </Paragraph>
          <KeyPoints
            eyebrow="At a glance"
            title="Keep evidence close"
            items={[
              {
                title: "Observe",
                description: "Record the conditions beside each measurement.",
              },
              {
                title: "Compare",
                description: "Look for a pattern across several visits.",
              },
              {
                title: "Qualify",
                description: "Make the limits of an interpretation visible.",
              },
            ]}
          />
          <AnchorHeading id={id("reading-method")}>Method</AnchorHeading>
          <Paragraph>
            The simplest useful record is often a short paragraph. It names the
            place, describes the conditions, and separates what was seen from
            what was inferred. A list helps when the same sequence must be
            followed on every visit. It gives the reader a way to check the
            method without interrupting the surrounding explanation.
          </Paragraph>
          <List
            items={[
              {
                content: "Visit each plot at roughly the same time of day.",
                blocks: [
                  <List
                    key="conditions"
                    items={[
                      { content: "Note recent rain and areas of shade." },
                      {
                        content: "Keep uncertain observations in the record.",
                      },
                    ]}
                  />,
                ],
              },
              { content: "Compare the new account with the previous visit." },
              {
                content:
                  "Write a short interpretation after collecting the observations.",
              },
            ]}
          />
          <Blockquote>
            <Paragraph>
              A useful record does not have to settle the question. It has to
              make the next observation easier to interpret.
            </Paragraph>
          </Blockquote>
          <Paragraph>
            That distinction matters when the evidence is incomplete. A missing
            visit should remain a gap in the account. Filling it with an
            expected result would make the series look smoother while hiding the
            very uncertainty that a later reader needs to understand.
          </Paragraph>
          <AnchorHeading id={id("reading-method-detail")} level={3}>
            A closer look
          </AnchorHeading>
          <Paragraph>
            A compact record can preserve these distinctions with ordinary
            fields. The example below is a description of the observation,
            rather than an instruction to run a particular application. Its
            small amount of code belongs to the same reading sequence as the
            paragraphs around it.
          </Paragraph>
          <CodeListing
            code={observationListing}
            language="text"
          />
          <Callout title="Keep the limitation visible" tone="note">
            One visit establishes a condition at one moment. A seasonal claim
            needs observations from more than one point in the season.
          </Callout>
          <Paragraph>
            The figure places three visits alongside one another. A caption
            tells the reader what comparison is intended, while the source
            annotation stays visually secondary. Neither should require a detour
            away from the narrative simply to understand what the figure
            contributes.
          </Paragraph>
          <DataFigure
            title="Three visits, one plot"
            visual={
              <List
                items={[
                  { content: "Early spring — damp soil, partial shade" },
                  {
                    content: "Late spring — dry surface, full shade",
                  },
                  { content: "Early summer — damp soil after rain" },
                ]}
              />
            }
            caption="Conditions vary between visits; shade alone does not explain moisture."
            source="Illustrative field notes"
          />
          <AnchorHeading id={id("reading-interpretation")}>
            Interpretation
          </AnchorHeading>
          <Paragraph>
            Taken together, the records suggest which questions deserve another
            visit. They do not eliminate the need for judgment. Rainfall, the
            time of day, and the person making the observation all affect the
            account. An honest conclusion keeps those influences in view while
            explaining why the emerging pattern is still useful.
          </Paragraph>
          <PullQuote
            align="inline"
            quote="The next question is part of the result."
            attribution="Field notebook"
            citation="Closing reflection"
          />
          <Paragraph>
            Returning to an earlier note should be as straightforward as moving
            to the next section. The same source is cited here again so that
            each occurrence has its own return destination.{" "}
            <sup>
              <a
                id={id("reading-reference-2")}
                href={`#${id("reading-source")}`}
                aria-label="See note 1, reference 2"
              >
                [1]
              </a>
            </sup>{" "}
            The reader can inspect the qualification, return to this sentence,
            and continue without reconstructing where the argument had reached.
          </Paragraph>
          <Paragraph>
            A good account ends with a proportionate claim. It says what the
            observations support, what remains uncertain, and what a further
            visit could resolve. Its structure helps a careful reader move among
            those levels of certainty at their own pace.
          </Paragraph>
          <Footnotes
            id={id("reading-notes")}
            tabIndex={-1}
            items={[{
              id: id("reading-source"),
              content: (
                <Paragraph>
                  These field notes are illustrative. The example demonstrates
                  how context and qualifications remain connected to more than
                  one passage in an article.
                </Paragraph>
              ),
              backReferences: [{ href: `#${id("reading-reference-1")}` }, {
                href: `#${id("reading-reference-2")}`,
              }],
            }]}
          />
        </Prose>
      </ArticleLayout>
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{
    id: "default",
    Example: ArticleLayoutExamples,
    capture: {
      selectors: ["[data-discern-example-article-viewport]"],
      framing: {
        mode: "allocation",
        reason:
          "The scrolling allocation keeps the complete long article available while the frame shows its opening reading measure.",
      },
    },
  }],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "reading-journey",
      label: "Section and repeated-note journey",
      example: "default",
      category: "interaction",
      sequence: [
        {
          action: "focus",
          target: {
            selector: '.discern-table-of-contents a[href$="-reading-method"]',
          },
        },
        {
          action: "click",
          target: {
            selector: '.discern-table-of-contents a[href$="-reading-method"]',
          },
        },
        { expect: "focused", target: { selector: '[id$="-reading-method"]' } },
        {
          action: "focus",
          target: { selector: '[id$="-reading-reference-2"]' },
        },
        {
          action: "click",
          target: { selector: '[id$="-reading-reference-2"]' },
        },
        { expect: "focused", target: { selector: '[id$="-reading-source"]' } },
        {
          action: "focus",
          target: { selector: 'a[href$="-reading-reference-2"]' },
        },
        {
          action: "click",
          target: { selector: 'a[href$="-reading-reference-2"]' },
        },
        {
          expect: "focused",
          target: { selector: '[id$="-reading-reference-2"]' },
        },
        {
          checkpoint: {
            id: "reference-return",
            label: "Return to second reference",
          },
        },
      ],
    },
  ],
);
