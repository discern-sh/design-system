import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");

/**
 * A width query belongs here only when the public Component contract is
 * genuinely page/viewport-scale. Embedded layout belongs to an @container
 * query instead. Reasons keep each exception reviewable.
 */
const viewportOwnedLayoutPolicies = new Map<string, string>([
  [
    "src/components/feedback/hover-card/hover-card.css",
    "The promoted floating panel is constrained and inset against the viewport and top layer, not its trigger allocation.",
  ],
  [
    "src/components/editorial/article-header/article-header.css",
    "The publication opener composes optional lead media and its bounded inner grid as a page-scale relationship.",
  ],
  [
    "src/components/editorial/article-layout/article-layout.css",
    "The page reading shell owns the sticky global-header offset and the table-of-contents, body, and rail relationship.",
  ],
  [
    "src/components/editorial/pull-quote/pull-quote.css",
    "The public wide alignment deliberately escapes reading measure until the page viewport can no longer hold the breakout.",
  ],
  [
    "src/components/editorial/related-content/related-content.css",
    "The full-width continuation band owns a bounded multi-story grid whose contract is the surrounding page.",
  ],
  [
    "src/components/marketing/site-header/site-header.css",
    "The sticky full-site header owns the viewport relationship between its brand, primary navigation, and compact menu trigger.",
  ],
  [
    "src/components/marketing/site-footer/site-footer.css",
    "The full-site footer owns the page-wide relationship between its brand, navigation columns, and closing legal row.",
  ],
  [
    "src/components/marketing/marketing-section/marketing-section.css",
    "The broad storytelling section owns page-frame rhythm and its bounded heading-to-content relationship at viewport scale.",
  ],
]);

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
