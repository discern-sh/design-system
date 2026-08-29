import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  captureRegionForReview,
  inspectReviewGeometry,
} from "../catalogue/review/geometry.ts";
import {
  planComponentReviewMatrix,
  selectComponentReviewSources,
  serializeComponentReviewManifest,
} from "../catalogue/review/matrix.ts";
import { reviewMotionStyle } from "../catalogue/review/motion.ts";
import {
  componentReviewHref,
  parseComponentReviewState,
} from "../catalogue/review/state.ts";
import type { ResolvedComponentReviewPosture } from "../catalogue/review-postures.ts";

const settled = (example: string): ResolvedComponentReviewPosture => ({
  id: `settled-${example}`,
  label: `${example} settled`,
  example,
  category: "default",
  sequence: [{ checkpoint: { id: `settled-${example}`, label: "Settled" } }],
  checkpoints: [{ id: `settled-${example}`, label: "Settled" }],
});
const sources = [
  {
    group: "Core",
    slug: "button",
    examples: ["default", "anchor"],
    postures: [
      settled("default"),
      settled("anchor"),
      {
        id: "pressed",
        label: "Pressed",
        example: "default",
        category: "interaction",
        sequence: [{ checkpoint: { id: "pressed", label: "Pressed" } }],
        checkpoints: [{ id: "pressed", label: "Pressed" }],
        requirements: { inlineSize: "narrow", appearance: "violet" },
      },
    ],
  },
  {
    group: "Forms",
    slug: "input",
    examples: ["default"],
    postures: [settled("default")],
  },
] as const;

Deno.test("review URLs reproduce every judgment input with a stable canonical order", () => {
  const state = parseComponentReviewState(
    new URL(
      "https://catalogue.example/catalogue/reviews/components/?posture=pressed&motion=reduced&component=button&appearance=violet&theme=dark&width=narrow&example=default&category=interaction&mode=reel&speed=slow&group=Core",
    ),
  );
  assertEquals(state, {
    group: "Core",
    component: "button",
    example: "default",
    posture: "pressed",
    category: "interaction",
    width: "narrow",
    theme: "dark",
    appearance: "violet",
    motion: "reduced",
    mode: "reel",
    speed: "slow",
  });
  assertEquals(
    componentReviewHref(state),
    "/catalogue/reviews/components/?group=Core&component=button&example=default&posture=pressed&category=interaction&width=narrow&theme=dark&appearance=violet&motion=reduced&mode=reel&speed=slow",
  );
});

Deno.test("local width changes allocated specimen size without lying about viewport", () => {
  assertEquals(
    inspectReviewGeometry({
      pageViewport: { width: 1440, height: 900 },
      requestedInlineSize: 390,
      specimenBounds: { x: 24, y: 40, width: 390, height: 120 },
    }),
    {
      pageViewport: { width: 1440, height: 900 },
      allocatedInlineSize: 390,
    },
  );
  assertThrows(
    () =>
      inspectReviewGeometry({
        pageViewport: { width: 1440, height: 900 },
        requestedInlineSize: 390,
        specimenBounds: { x: 24, y: 40, width: 720, height: 120 },
      }),
    TypeError,
    "requested 390px",
  );
});

Deno.test("portalled evidence uses the declared multi-root capture union and fails outside its host", () => {
  assertEquals(
    captureRegionForReview(
      [
        { x: 100, y: 100, width: 240, height: 80 },
        { x: 420, y: 80, width: 180, height: 220 },
      ],
      { x: 0, y: 0, width: 800, height: 600 },
      "dialog/open",
    ),
    { x: 100, y: 80, width: 500, height: 220 },
  );
  for (
    const regions of [
      [],
      [{ x: 900, y: 20, width: 100, height: 100 }],
      [{ x: 20, y: 20, width: 0, height: 100 }],
    ]
  ) {
    assertThrows(
      () =>
        captureRegionForReview(
          regions,
          { x: 0, y: 0, width: 800, height: 600 },
          "dialog/open",
        ),
      TypeError,
      "dialog/open",
    );
  }
});

Deno.test("capture validation accepts contained local overflow and viewport evidence without accepting either outside", () => {
  assertEquals(
    captureRegionForReview(
      [
        { x: 820, y: 40, width: 160, height: 40 },
        { x: 120, y: 140, width: 320, height: 220 },
      ],
      [
        { x: 760, y: 20, width: 720, height: 180 },
        { x: 0, y: 0, width: 800, height: 600 },
      ],
      "button-and-portal",
    ),
    { x: 120, y: 40, width: 860, height: 320 },
  );
  assertThrows(
    () =>
      captureRegionForReview(
        [{ x: 1500, y: 20, width: 80, height: 40 }],
        [
          { x: 760, y: 20, width: 720, height: 180 },
          { x: 0, y: 0, width: 800, height: 600 },
        ],
        "outside-both-hosts",
      ),
    TypeError,
    "outside-both-hosts",
  );
});

Deno.test("the review matrix covers baseline axes without a Cartesian explosion", () => {
  const matrix = planComponentReviewMatrix(sources);
  const defaults = matrix.filter(({ category }) => category === "default");
  assertEquals(defaults.length, 12); // three examples × four baseline witnesses
  assertEquals(matrix.filter(({ posture }) => posture === "pressed").length, 1);
  assert(
    matrix.length < 3 * 2 * 3 * 4 * 2,
    "matrix became a full cross-product",
  );

  const core = selectComponentReviewSources(sources, { group: "Core" });
  assertEquals(core.map(({ slug }) => slug), ["button"]);
  assertEquals(
    selectComponentReviewSources(sources, { component: "input" }).map((
      { slug },
    ) => slug),
    ["input"],
  );
});

Deno.test("review manifest is deterministic, portable, and metadata-only", () => {
  const first = serializeComponentReviewManifest(
    planComponentReviewMatrix(sources),
  );
  const second = serializeComponentReviewManifest(
    planComponentReviewMatrix(sources),
  );
  assertEquals(first, second);
  assertStringIncludes(first, '"version": 1');
  assert(!first.includes("/Users/"));
  assert(!/\d{4}-\d{2}-\d{2}T/.test(first));
});

Deno.test("review metadata and output stay outside the package contract", async () => {
  const config = JSON.parse(
    await Deno.readTextFile(new URL("../deno.json", import.meta.url)),
  ) as {
    exports: Record<string, string>;
    publish: { include: string[] };
  };
  const exportedSources = Object.values(config.exports).join("\n");
  assert(!exportedSources.includes("catalogue/"));
  assert(!exportedSources.includes("review"));
  assert(!config.publish.include.includes("catalogue/"));
  assert(!config.publish.include.includes("scripts/"));
  assert(!config.publish.include.includes("dist/"));
});

Deno.test("production, slowed diagnostic, and reduced motion remain distinct", () => {
  assertEquals(reviewMotionStyle("ordinary", "production"), {});
  const slowed = reviewMotionStyle("ordinary", "slow");
  assert(
    Object.keys(slowed).every((name) => name.startsWith("--discern-duration-")),
  );
  assert(Object.values(slowed).every((value) => value.endsWith("ms")));
  assertEquals(reviewMotionStyle("reduced", "production"), {
    "--discern-duration-fast": "0ms",
    "--discern-duration-medium": "0ms",
    "--discern-duration-reveal": "0ms",
  });
});

Deno.test("reduced review motion cannot expose a delayed animation start frame", async () => {
  const css = await Deno.readTextFile(
    new URL("../catalogue/review/review.css", import.meta.url),
  );
  const reducedRule = css.match(
    /\.discern-review-specimen\[data-discern-review-motion="reduced"\][^{]*\{([^}]*)\}/s,
  )?.[1] ?? "";
  assertStringIncludes(reducedRule, "animation-delay: 0ms !important");
  assertStringIncludes(reducedRule, "animation-duration: 0ms !important");
  assertStringIncludes(reducedRule, "animation-iteration-count: 1 !important");
  assertStringIncludes(reducedRule, "transition-delay: 0ms !important");
  assertStringIncludes(reducedRule, "transition-duration: 0ms !important");
  assertStringIncludes(
    css,
    '.discern-review-specimen[data-discern-review-motion="reduced"] .discern-backdrop *',
  );
  assertStringIncludes(css, "pointer-events: none !important");
});

Deno.test("review-card chrome cannot restyle headings or prose inside a specimen", async () => {
  const css = await Deno.readTextFile(
    new URL("../catalogue/review/review.css", import.meta.url),
  );
  for (
    const selector of [
      ".discern-review-card > header h2",
      ".discern-review-card > header p",
      ".discern-review-card > header code",
    ]
  ) {
    assertStringIncludes(css, selector);
  }
  assert(!/\.discern-review-card\s+(?:h2|header\s+(?:p|code))\s*\{/u.test(css));
});
