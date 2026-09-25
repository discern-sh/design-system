import { assert, assertEquals } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import type { ComponentType } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import * as react from "../src/react.ts";
import {
  phraseIterations,
  phraseWait,
} from "../src/components/artwork/phrase.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

/** Every concrete Artwork piece, enrolled by Group membership: a new
 * Backdrop is checked here without being listed. */
const ARTWORK = componentRegistry
  .filter(({ meta }) => meta.group === "Artwork" && meta.slug !== "backdrop")
  .map(({ meta }) => meta.slug);

function exportName(slug: string): string {
  return slug.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

interface PhraseTiming {
  readonly slug: string;
  readonly name: string;
  readonly duration: number;
  readonly delay: number;
  readonly iterations: number;
  readonly endTime: number;
  /** How far a staggered element jumps where its loop closes: rendered
   * bounds in px and opacity, either side of the seam. */
  readonly seam: number;
}

/** Read the timing of every animation under each tagged section. */
function phraseTimings(page: Page): Promise<PhraseTiming[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("section[data-slug]")]
      .flatMap((section) =>
        section.getAnimations({ subtree: true }).map((animation) => {
          const effect = animation.effect as KeyframeEffect;
          const timing = effect.getComputedTiming();
          const duration = Number(timing.duration);
          const delay = timing.delay ?? 0;
          let seam = 0;
          if (delay < 0 && effect.target instanceof Element) {
            const target = effect.target;
            animation.pause();
            // Active time runs |delay| ahead of current time; sample the last
            // instant of the first period and the first of the second.
            const sample = (active: number) => {
              animation.currentTime = active + delay;
              const box = target.getBoundingClientRect();
              return [
                box.x,
                box.y,
                box.width,
                box.height,
                Number(getComputedStyle(target).opacity) * 100,
              ];
            };
            const before = sample(duration - 0.5);
            const after = sample(duration);
            seam = Math.max(...before.map((v, i) => Math.abs(v - after[i]!)));
          }
          return {
            slug: section.dataset.slug!,
            name: (animation as CSSAnimation).animationName,
            duration,
            delay,
            iterations: timing.iterations ?? 1,
            endTime: Number(timing.endTime),
            seam,
          };
        })
      )
  );
}

/** A finite animation must play at least one whole cycle after the first
 * frame. One staggered by starting partway into its loop must play exactly
 * one period — in step with the rest of the phrase, ending where it began —
 * and its keyframes must close the loop, or it jumps mid-phrase. */
function truncatedPhrases(timings: readonly PhraseTiming[]): string[] {
  return timings.filter(({ iterations }) => Number.isFinite(iterations))
    .flatMap((timing) => {
      const short = timing.duration - timing.endTime;
      if (short > 1) {
        return [
          `${timing.slug} ${timing.name} stops ${
            Math.round(short)
          }ms short of one full cycle`,
        ];
      }
      if (timing.delay < 0 && Math.abs(short) > 1) {
        return [
          `${timing.slug} ${timing.name} is staggered into its loop but runs ${
            Math.round(-short)
          }ms past one period`,
        ];
      }
      if (timing.seam > 0.5) {
        return [
          `${timing.slug} ${timing.name} jumps where its loop closes; wait for its turn instead of starting partway in`,
        ];
      }
      return [];
    });
}

Deno.test("phrase timing keeps the authored stagger inside one period", () => {
  assertEquals(phraseIterations(0, 108), 1);
  assertEquals(phraseIterations(48, 108), 1.444444);
  assertEquals(phraseIterations(-60, 108), 1.444444, "advances wrap");
  assertEquals(phraseIterations(108, 108), 1);
  assertEquals(phraseWait(0, 108), 0);
  assertEquals(phraseWait(7.71, 108), 100.29);
  assertEquals(phraseWait(100.29, 108), 7.71, "the stagger's order is kept");
});

Deno.test("every finite Artwork phrase plays each element's whole cycle from the first frame", async () => {
  assert(ARTWORK.length >= 10, "the census must find the Artwork Group");
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ARTWORK,
    });
    const css = await Deno.readTextFile(join(output, "discern.css"));
    const exports = react as unknown as Record<string, ComponentType>;
    const sections = ARTWORK.map((slug) => {
      const Component = exports[exportName(slug)];
      assert(Component, `${slug} must export ${exportName(slug)}`);
      return `<section data-slug="${slug}" style="position:relative;width:960px;height:540px">${
        renderToStaticMarkup(createElement(Component))
      }</section>`;
    });
    // Faithful reproductions of both defects, so the guard cannot pass
    // vacuously: a staggered turn played once, and a staggered element whose
    // keyframes do not close its loop.
    const witness =
      `<section data-slug="witness"><i style="display:block;animation:truncated 10s linear 1 -4s both"></i><i style="display:block;animation:seamed 10s linear 1.4 -4s both"></i></section><style>@keyframes truncated{50%{opacity:.5}}@keyframes seamed{to{opacity:0}}</style>`;
    const page = await browser.newPage();
    await page.setContent(
      `<html data-discern-root><style>${css}</style><body>${
        sections.join("")
      }${witness}</body></html>`,
    );
    const timings = await phraseTimings(page);
    assert(
      timings.filter(({ slug }) => slug !== "witness").length > 100,
      "the census must read the pieces' real animations",
    );
    const failures = truncatedPhrases(timings);
    assertEquals(
      failures.filter((failure) => failure.startsWith("witness ")),
      [
        "witness truncated stops 4000ms short of one full cycle",
        "witness seamed jumps where its loop closes; wait for its turn instead of starting partway in",
      ],
      "both witnesses must be caught",
    );
    assertEquals(
      failures.filter((failure) => !failure.startsWith("witness ")),
      [],
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
