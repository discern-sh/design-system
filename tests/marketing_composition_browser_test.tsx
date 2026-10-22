import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { compositionRecipes } from "../catalogue/compositions.tsx";
import { catalogueExamples as bentoExamples } from "../src/components/marketing/feature-bento/feature-bento.examples.tsx";
import {
  AudienceGrid,
  Button,
  ClosingStatement,
  CtaBand,
  EditorialHero,
  FaqBlock,
  FeatureBento,
  HeroBlock,
  IconButton,
  MarketingIntro,
  MarketingSection,
  MetricsBand,
  SiteHeader,
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
      await withViewport(
        page,
        { width, height: 1000 },
        async () => {
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
        },
      );
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("End-aligned bento copy keeps its icon at the top and its copy at the tile's end", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["feature-bento"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const example = bentoExamples.find(({ id }) => id === "copy-led-matrix");
    assert(example !== undefined, "the copy-led bento example is missing");
    const markup = renderToStaticMarkup(<example.Example />);
    const page = await browser.newPage();
    for (const width of [390, 1120, 1440]) {
      await withViewport(page, { width, height: 1000 }, async () => {
        await page.setContent(
          `<html data-discern-root><style>${css}</style><style>body{margin:0}</style><body>${markup}</body></html>`,
        );
        const facts = await page.locator(
          ".discern-feature-bento__item--align-end",
        ).evaluate((tile) => {
          const box = (selector: string) =>
            tile.querySelector(selector)!.getBoundingClientRect();
          const copy = tile.querySelector(".discern-feature-bento__copy")!;
          const style = getComputedStyle(copy);
          const icon = box(".discern-feature-bento__icon");
          const heading = box("h3");
          const lastParagraph = [...copy.querySelectorAll("p")].at(-1)!;
          const tileBox = tile.getBoundingClientRect();
          return {
            iconInset: icon.top - tileBox.top,
            copyInset: tileBox.bottom -
              lastParagraph.getBoundingClientRect().bottom,
            iconGap: heading.top - icon.bottom,
            paddingStart: parseFloat(style.paddingBlockStart),
            paddingEnd: parseFloat(style.paddingBlockEnd),
            iconMargin: parseFloat(
              getComputedStyle(
                copy.querySelector(".discern-feature-bento__icon")!,
              ).marginBlockEnd,
            ),
          };
        });
        const edge = 2;
        assert(
          Math.abs(facts.iconInset - facts.paddingStart) <= edge,
          `${width}: the icon left the top of its tile (${facts.iconInset}px)`,
        );
        assert(
          Math.abs(facts.copyInset - facts.paddingEnd) <= edge,
          `${width}: the copy left the end of its tile (${facts.copyInset}px)`,
        );
        assert(
          facts.iconGap >= facts.iconMargin - 1,
          `${width}: the copy rose into the icon's space (${facts.iconGap}px)`,
        );
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("actions keep their material on every Marketing contrast scope in both themes", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["Marketing", "Core"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const actions = (
      <>
        <Button href="#primary">Primary action</Button>
        <Button href="#secondary" variant="secondary">Secondary action</Button>
      </>
    );
    const markup = renderToStaticMarkup(
      <>
        <MarketingSection surface="contrast">{actions}</MarketingSection>
        <ClosingStatement title="Close the page." actions={actions} />
        <CtaBand
          title="Take the next step."
          tone="contrast"
          actions={actions}
        />
      </>,
    );
    const page = await browser.newPage({
      viewport: { width: 1120, height: 900 },
    });
    for (const theme of ["light", "dark"]) {
      await page.setContent(
        `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><body>${markup}</body></html>`,
      );
      const scopes = await page.evaluate(() => {
        const lightness = (value: string) => {
          const match = value.match(/^(oklch|oklab|rgba?)\(([^)]*)\)/);
          if (!match) throw new Error(`Unparsed colour ${value}`);
          const parts = match[2]!.split(/[\s,/]+/).filter(Boolean);
          const alpha = parts.length > 3 ? parseFloat(parts[3]!) : 1;
          if (match[1]!.startsWith("ok")) {
            const first = parts[0]!;
            const lightness = first.endsWith("%")
              ? parseFloat(first) / 100
              : parseFloat(first);
            return { lightness, alpha };
          }
          const [r, g, b] = parts.slice(0, 3).map((part) => {
            const channel = parseFloat(part) / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return {
            lightness: Math.cbrt(0.2126 * r! + 0.7152 * g! + 0.0722 * b!),
            alpha,
          };
        };
        return [...document.querySelectorAll(".discern-marketing-contrast")]
          .map((scope) => {
            const ground = lightness(getComputedStyle(scope).backgroundColor);
            const primary = scope.querySelector(
              ".discern-button:not(.discern-button--secondary)",
            )!;
            const secondary = scope.querySelector(
              ".discern-button--secondary",
            )!;
            const fill = lightness(getComputedStyle(primary).backgroundColor);
            const label = lightness(getComputedStyle(primary).color);
            const edge = lightness(
              getComputedStyle(secondary).borderTopColor,
            );
            const edgeOverGround = edge.alpha * edge.lightness +
              (1 - edge.alpha) * ground.lightness;
            return {
              scope: scope.className,
              fill: Math.abs(fill.lightness - ground.lightness),
              label: Math.abs(label.lightness - fill.lightness),
              edge: Math.abs(edgeOverGround - ground.lightness),
            };
          });
      });
      assertEquals(scopes.length, 3, `${theme} lost a contrast scope`);
      for (const scope of scopes) {
        assert(
          scope.fill >= 0.5,
          `${theme}: the primary action sinks into ${scope.scope} (${scope.fill})`,
        );
        assert(
          scope.label >= 0.5,
          `${theme}: the primary label sinks into its fill in ${scope.scope}`,
        );
        assert(
          scope.edge >= 0.1,
          `${theme}: the secondary action loses its edge in ${scope.scope} (${scope.edge})`,
        );
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

/**
 * In-page OKLab lightness of a computed colour composited over a ground, so
 * translucent fills are judged as painted rather than as declared.
 */
const LIGHTNESS_SOURCE = `(value, ground = 0) => {
  const match = value.match(/^(oklch|oklab|rgba?|color)\\(([^)]*)\\)/);
  if (!match) throw new Error("Unparsed colour " + value);
  const parts = match[2].replace(/^srgb\\s+/, "").split(/[\\s,/]+/).filter(Boolean);
  const alpha = parts.length > 3 ? parseFloat(parts[3]) : 1;
  let lightness;
  if (match[1].startsWith("ok")) {
    lightness = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
  } else {
    const scale = match[1] === "color" ? 1 : 255;
    const [r, g, b] = parts.slice(0, 3).map((part) => {
      const channel = parseFloat(part) / scale;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    lightness = Math.cbrt(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return alpha * lightness + (1 - alpha) * ground;
}`;

Deno.test("Marketing contrast scopes keep hover, press, inset, and figure contrast in both themes", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: ["Marketing", "Core"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const controls = (
      <>
        <Button href="#secondary" variant="secondary">Secondary action</Button>
        <IconButton label="Pin" icon={<span>+</span>} />
      </>
    );
    const markup = renderToStaticMarkup(
      <>
        <MarketingSection surface="contrast">{controls}</MarketingSection>
        <CtaBand
          title="Take the next step."
          tone="contrast"
          actions={controls}
        />
        <ClosingStatement title="Close the page." actions={controls} />
        <MetricsBand
          title="Example measures."
          tone="contrast"
          items={[{ value: "24", label: "completed items", detail: "Sample" }]}
        />
      </>,
    );
    const page = await browser.newPage({
      viewport: { width: 1120, height: 900 },
    });
    // Settled paint is the contract; reduced motion removes transition timing.
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["light", "dark"]) {
      await page.setContent(
        `<html data-discern-root data-discern-theme="${theme}"><style>${css}</style><body>${markup}</body></html>`,
      );
      const scopes = page.locator(".discern-marketing-contrast");
      const count = await scopes.count();
      assertEquals(count, 4, `${theme} lost a contrast scope`);
      for (let index = 0; index < count; index++) {
        const scope = scopes.nth(index);
        const name = await scope.getAttribute("class");
        const roles = await scope.evaluate((element, source) => {
          const lightness = new Function(`return ${source}`)();
          const ground = lightness(getComputedStyle(element).backgroundColor);
          // A fresh probe per role, so no colour transition reports a stale value.
          const role = (name: string) => {
            const probe = document.createElement("span");
            probe.style.color = `var(--discern-color-${name})`;
            element.append(probe);
            const value = lightness(getComputedStyle(probe).color, ground);
            probe.remove();
            return value;
          };
          return {
            ground,
            sunken: role("surface-sunken"),
            accents: ["100", "200", "300"].map((step) =>
              role(`accent-${step}`)
            ),
          };
        }, LIGHTNESS_SOURCE);
        assert(
          roles.sunken < roles.ground,
          `${theme}: a sunken inset rises above ${name} (${roles.sunken} over ${roles.ground})`,
        );
        for (const [step, value] of roles.accents.entries()) {
          assert(
            value > roles.ground && value < 0.5,
            `${theme}: wash ${step} leaves the dark ladder in ${name} (${value})`,
          );
        }
        const metric = scope.locator(".discern-metrics-band__value");
        if (await metric.count()) {
          const figure = await metric.evaluate((element, source) => {
            const lightness = new Function(`return ${source}`)();
            const scope = element.closest(".discern-marketing-contrast")!;
            return Math.abs(
              lightness(getComputedStyle(element).color) -
                lightness(getComputedStyle(scope).backgroundColor),
            );
          }, LIGHTNESS_SOURCE);
          assert(figure >= 0.5, `${theme}: metric figures sink into ${name}`);
          continue;
        }
        const paint = (selector: string) =>
          scope.locator(selector).first().evaluate((element, source) => {
            const lightness = new Function(`return ${source}`)();
            const scope = element.closest(".discern-marketing-contrast")!;
            const ground = lightness(getComputedStyle(scope).backgroundColor);
            const style = getComputedStyle(element);
            return {
              fill: lightness(style.backgroundColor, ground),
              ink: lightness(style.color, ground),
            };
          }, LIGHTNESS_SOURCE);
        const secondary = scope.locator(".discern-button--secondary").first();
        const rest = await paint(".discern-button--secondary");
        await secondary.hover();
        await page.waitForTimeout(50);
        const hovered = await paint(".discern-button--secondary");
        assert(
          hovered.fill - rest.fill >= 0.03,
          `${theme}: secondary hover is invisible in ${name} (${rest.fill} -> ${hovered.fill})`,
        );
        const icon = scope.locator(".discern-icon-button").first();
        const box = (await icon.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(50);
        const pressed = await paint(".discern-icon-button");
        await page.mouse.up();
        await page.mouse.move(0, 0);
        assert(
          pressed.fill < 0.5 && pressed.ink - pressed.fill >= 0.4,
          `${theme}: a pressed Icon button flashes under its glyph in ${name} (${pressed.fill})`,
        );
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("a narrow Site header keeps every nav link's focus ring and hover fill inside its scroll row", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["site-header"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const navItems = [
      { label: "Overview", href: "#overview", current: "page" },
      { label: "Principles", href: "#principles" },
      { label: "Resources", href: "#resources" },
    ] as const;
    const markup = renderToStaticMarkup(
      <>
        <SiteHeader brand="Example brand" brandMark="E" navItems={navItems} />
        <SiteHeader
          brand="Example brand"
          brandMark="E"
          navItems={navItems}
          variant="campaign"
        />
      </>,
    );
    const page = await browser.newPage();
    for (const width of [360, 600]) {
      await withViewport(page, { width, height: 800 }, async () => {
        await page.setContent(
          `<html data-discern-root><style>${css}</style><style>body{margin:0}</style><body>${markup}</body></html>`,
        );
        const headers = page.locator(".discern-site-header");
        for (let index = 0; index < await headers.count(); index++) {
          const link = headers.nth(index).locator(
            ".discern-site-header__nav a",
          ).first();
          await link.focus();
          const facts = await link.evaluate((element) => {
            const nav = element.parentElement!;
            const style = getComputedStyle(element);
            const reach = parseFloat(style.outlineOffset) +
              parseFloat(style.outlineWidth);
            const ring = element.getBoundingClientRect();
            const port = nav.getBoundingClientRect();
            const label = document.createRange();
            label.selectNodeContents(element);
            const brand = nav.closest(".discern-site-header")!
              .querySelector(".discern-brand")!.getBoundingClientRect();
            return {
              outline: style.outlineStyle,
              inside: ring.left - reach >= port.left - 0.5 &&
                ring.right + reach <= port.right + 0.5 &&
                ring.top - reach >= port.top - 0.5 &&
                ring.bottom + reach <= port.bottom + 0.5,
              labelOffset: label.getBoundingClientRect().left - brand.left,
              pageOverflow: document.documentElement.scrollWidth -
                innerWidth,
            };
          });
          assertEquals(facts.outline, "solid");
          assert(
            facts.inside,
            `${width}: the first nav link's focus ring leaves its scroll row`,
          );
          assert(
            Math.abs(facts.labelOffset) <= 1,
            `${width}: the first nav label drifts from the brand (${facts.labelOffset}px)`,
          );
          assertEquals(
            facts.pageOverflow,
            0,
            `${width}: the header scrolls the page`,
          );
        }
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("FAQ answers open without clipping focus rings and settle at once under reduced motion", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["faq-block"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const markup = renderToStaticMarkup(
      <FaqBlock
        title="Questions"
        openFirst
        items={[{
          question: "Where is the guide?",
          answer: (
            <p>
              <a href="#guide">Read the guide</a> before you start.
            </p>
          ),
        }, {
          question: "Who can attend?",
          answer: <p>Anyone affected by the decision.</p>,
        }]}
      />,
    );
    const page = await browser.newPage({
      viewport: { width: 1120, height: 900 },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setContent(
      `<html data-discern-root><style>${css}</style><body>${markup}</body></html>`,
    );
    const durations = await page.locator(".discern-faq-block details")
      .evaluateAll((items) =>
        items.map((item) =>
          getComputedStyle(item, "::details-content").transitionDuration
            .split(",").map((value) => parseFloat(value))
        )
      );
    for (const duration of durations) {
      assert(
        duration.every((value) => value <= 0.0001),
        `answers still animate under reduced motion (${duration}s)`,
      );
    }
    const link = page.locator(".discern-faq-block__answer a");
    await link.focus();
    const clip = await link.evaluate((element) => {
      const details = element.closest("details")!;
      const summary = details.querySelector("summary")!.getBoundingClientRect();
      const box = details.getBoundingClientRect();
      const content = getComputedStyle(details, "::details-content");
      const style = getComputedStyle(element);
      const reach = parseFloat(style.outlineOffset) +
        parseFloat(style.outlineWidth);
      const ring = element.getBoundingClientRect();
      const answer = element.closest(".discern-faq-block__answer")!
        .getBoundingClientRect();
      return {
        left: ring.left - reach - (box.left + parseFloat(content.marginLeft)),
        top: ring.top - reach -
          (summary.bottom + parseFloat(content.marginTop)),
        alignment: answer.left - summary.left,
      };
    });
    assert(
      clip.left >= -0.5 && clip.top >= -0.5,
      `an open answer clips focus rings (${clip.left}px, ${clip.top}px)`,
    );
    assert(
      Math.abs(clip.alignment) <= 0.5,
      `answers drift from their questions (${clip.alignment}px)`,
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
