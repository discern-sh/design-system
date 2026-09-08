import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { compositionRecipes } from "../catalogue/compositions.tsx";
import { catalogueExamples as bentoExamples } from "../src/components/marketing/feature-bento/feature-bento.examples.tsx";
import {
  AudienceGrid,
  EditorialHero,
  FeatureBento,
  HeroBlock,
  MarketingIntro,
} from "../src/react.ts";

Deno.test("Marketing content controls card height, optional tracks, and title wrapping", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["Marketing"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const word = "InterdisciplinaryWorkshopPreparation";
    const markup = renderToStaticMarkup(
      <>
        <EditorialHero
          title={word}
          description={<p>Bring one question and leave with a plan.</p>}
        />
        <MarketingIntro
          title={word}
          scale="editorial"
          description={<p>Read the preparation notes.</p>}
        />
        <HeroBlock
          title={word}
          layout="showcase"
          description={<p>Make room for discussion.</p>}
        />
        <FeatureBento
          title="Preparation"
          items={[
            {
              title: "A question",
              description: "Write it down.",
              size: "wide",
            },
            {
              title: "A decision",
              description: "Name the owner.",
              size: "wide",
            },
          ]}
        />
        <AudienceGrid
          title="Who to invite"
          items={[{
            title: "Facilitator",
            description: "Guide the discussion.",
          }]}
        />
      </>,
    );
    for (const width of [390, 720, 1120]) {
      for (const textSize of [16, 32]) {
        await page.setContent(
          `<html data-discern-root><style>${css}</style><style>html{font-size:${textSize}px}body{margin:0}main{width:${width}px}</style><body><main>${markup}</main></body></html>`,
        );
        const facts = await page.locator("main").evaluate((root) => {
          const titles = [...root.querySelectorAll<HTMLElement>("h1,h2,h3")];
          const wide = root.querySelector<HTMLElement>(
            ".discern-feature-bento__item--wide",
          )!;
          const copy = wide.firstElementChild!.getBoundingClientRect();
          const card = wide.getBoundingClientRect();
          const audience = root.querySelector<HTMLElement>(
            ".discern-audience-grid__item",
          )!;
          return {
            overflow: titles.filter((e) => e.scrollWidth > e.clientWidth + 1)
              .map((e) => e.className || e.textContent),
            copyRatio: copy.width / card.width,
            cardHeight: card.height,
            audienceHeight: audience.getBoundingClientRect().height,
          };
        });
        assert(
          facts.overflow.length === 0,
          `Titles overflow at ${width}/${textSize}: ${facts.overflow}`,
        );
        assert(
          facts.copyRatio > .95,
          `Text-only wide card reserves an absent visual at ${width}: ${facts.copyRatio}`,
        );
        if (width === 1120 && textSize === 16) {
          assert(
            facts.cardHeight < 220,
            `Sparse bento card is ${facts.cardHeight}px tall`,
          );
          assert(
            facts.audienceHeight < 240,
            `Sparse audience card is ${facts.audienceHeight}px tall`,
          );
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Workshop page and canonical bentos retain content and reading order across page widths and text settings", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["Marketing", "Core"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const recipe = compositionRecipes.find((recipe) =>
      recipe.id === "reading-first-landing"
    )!;
    const markup = renderToStaticMarkup(
      <>
        <recipe.Example />
        {bentoExamples.map(({ id, Example }) => (
          <div key={id}>
            <Example />
          </div>
        ))}
      </>,
    );
    const page = await browser.newPage();
    for (const width of [390, 720, 1120]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        for (const font of ["serif", "sans-serif"]) {
          await page.setContent(
            `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><style>html{font-size:32px;--discern-font-display:${font};--discern-font-body:${font};--discern-font-ui:${font}}body{margin:0}</style><body>${markup}</body></html>`,
          );
          const facts = await page.locator("body").evaluate((root) => {
            const bounds = root.getBoundingClientRect();
            const headings = [
              ...root.querySelectorAll<HTMLElement>("h1,h2,h3"),
            ];
            const cards = [
              ...root.querySelectorAll<HTMLElement>(
                ".discern-feature-bento__item",
              ),
            ];
            const links = [
              ...root.querySelectorAll<HTMLAnchorElement>("a[href^='#']"),
            ];
            return {
              overflow: [
                ...root.querySelectorAll<HTMLElement>(
                  "h1,h2,h3,p,li,.discern-feature-bento__copy",
                ),
              ].filter((e) =>
                e.scrollWidth > e.clientWidth + 1 ||
                e.getBoundingClientRect().right > bounds.right + 1
              ).map((e) => e.textContent),
              h1: headings.filter((e) => e.tagName === "H1").length,
              missingTargets: links.filter((e) =>
                !root.querySelector(e.getAttribute("href")!)
              ).map((e) => e.textContent),
              cards: cards.map((e) => ({
                top: e.getBoundingClientRect().top,
                left: e.getBoundingClientRect().left,
              })),
            };
          });
          assertEquals(facts.overflow, [], `${width}/${theme}/${font}`);
          assertEquals(facts.h1, 1);
          assertEquals(facts.missingTargets, []);
          for (let i = 1; i < facts.cards.length; i++) {
            const previous = facts.cards[i - 1]!;
            const current = facts.cards[i]!;
            assert(
              current.top >= previous.top - 1,
              "Visual card order must follow source order",
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
