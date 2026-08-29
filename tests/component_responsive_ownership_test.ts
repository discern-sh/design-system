import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import {
  componentReviewInlineSize,
  componentReviewResponsiveAllocation,
  componentViewportLayoutPolicies,
} from "../catalogue/review/responsive-ownership.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");

/**
 * A width query belongs here only when the public Component contract is
 * genuinely page/viewport-scale. Embedded layout belongs to an @container
 * query instead. Reasons keep each exception reviewable.
 */
const viewportOwnedLayoutPolicies = new Map<string, string>(
  componentViewportLayoutPolicies.map(({ stylesheet, reason }) => [
    stylesheet,
    reason,
  ]),
);

function viewportWidthQueries(css: string): readonly string[] {
  return [...css.matchAll(/@media\s*([^{}]+)\{/g)]
    .map((match) => match[1]?.trim())
    .filter((query): query is string =>
      query !== undefined &&
      /(?:^|[^-])\b(?:min-|max-)?width\b|\binline-size\b/.test(query)
    );
}

function responsiveOwnershipViolations(
  stylesheets: ReadonlyMap<string, string>,
  policies: ReadonlyMap<string, string>,
): readonly string[] {
  const violations: string[] = [];
  const liveViewportOwners = new Set<string>();
  for (const [path, css] of stylesheets) {
    const queries = viewportWidthQueries(css);
    if (queries.length === 0) continue;
    liveViewportOwners.add(path);
    const reason = policies.get(path);
    if (reason === undefined) {
      violations.push(
        `${path} uses viewport width for Component layout: ${
          queries.join(", ")
        }`,
      );
    } else if (reason.trim().length < 40) {
      violations.push(`${path} has an uninformative viewport policy`);
    }
  }
  for (const path of policies.keys()) {
    if (!liveViewportOwners.has(path)) {
      violations.push(`${path} has a stale viewport policy`);
    }
  }
  return violations.toSorted();
}

async function componentStylesheets(
  directory: string,
): Promise<ReadonlyMap<string, string>> {
  const stylesheets = new Map<string, string>();
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) {
      for (const [childPath, css] of await componentStylesheets(path)) {
        stylesheets.set(childPath, css);
      }
    } else if (entry.isFile && entry.name.endsWith(".css")) {
      stylesheets.set(
        relative(PACKAGE_ROOT, path),
        await Deno.readTextFile(path),
      );
    }
  }
  return stylesheets;
}

Deno.test("Component width reflow follows local allocation unless its viewport ownership is explicit", async () => {
  assertEquals(
    responsiveOwnershipViolations(
      await componentStylesheets(COMPONENT_ROOT),
      viewportOwnedLayoutPolicies,
    ),
    [],
  );
});

Deno.test("a synthetic future embedded Component cannot add a viewport layout query silently", () => {
  const path = "src/components/future/future-grid/future-grid.css";
  const stylesheets = new Map([[
    path,
    `
      .discern-future-grid { display: grid; }
      @media (max-width: 40rem) {
        .discern-future-grid { grid-template-columns: 1fr; }
      }
    `,
  ]]);
  assertEquals(
    responsiveOwnershipViolations(stylesheets, new Map()),
    [
      `${path} uses viewport width for Component layout: (max-width: 40rem)`,
    ],
  );
  assertEquals(
    responsiveOwnershipViolations(
      stylesheets,
      new Map([[
        path,
        "This synthetic fixture represents full-site chrome whose allocation is the viewport.",
      ]]),
    ),
    [],
  );
});

Deno.test("page-scale review allocation follows the page while embedded evidence stays local", () => {
  assertEquals(componentReviewResponsiveAllocation("hover-card"), "local");
  assertEquals(componentReviewResponsiveAllocation("future-grid"), "local");
  assertEquals(componentReviewResponsiveAllocation("article-layout"), "page");
  assertEquals(
    componentReviewInlineSize({
      slug: "future-grid",
      requestedInlineSize: 390,
      pageViewportWidth: 1440,
    }),
    390,
  );
  assertEquals(
    componentReviewInlineSize({
      slug: "article-layout",
      requestedInlineSize: 390,
      pageViewportWidth: 1440,
    }),
    1120,
  );
  assertEquals(
    componentReviewInlineSize({
      slug: "article-layout",
      requestedInlineSize: 1120,
      pageViewportWidth: 430,
    }),
    430,
  );
});
