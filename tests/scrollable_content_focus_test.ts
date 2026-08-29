import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");

interface ScrollableRule {
  readonly selector: string;
  readonly source: string;
}

/**
 * Scroll containers whose contract guarantees focusable descendants or whose
 * focus policy is owned by OverflowCue. Every other Component overflow owner
 * is treated as content and must itself be a named keyboard viewport.
 */
const descendantFocusPolicies = new Map<string, string>([
  [
    "src/components/marketing/site-header/site-header.css::.discern-site-header__nav",
    "Site header navigation contains authored links.",
  ],
  [
    "src/components/navigation/breadcrumbs/breadcrumbs.css::.discern-breadcrumbs",
    "Breadcrumb overflow is traversed through its ancestor links.",
  ],
  [
    "src/components/navigation/tabs/tabs.css::.discern-tabs__list",
    "The tablist owns roving-focus buttons.",
  ],
  [
    "src/components/feedback/hover-card/hover-card.css::.discern-hover-card__panel",
    "Hover card overflow is supplementary to its focusable trigger and rich-content focus route.",
  ],
  [
    "src/components/feedback/hover-card/hover-card.css::.discern-hover-card .discern-hover-card__panel[data-discern-floating-enhanced]",
    "The enhanced Hover card preserves the same trigger and rich-content focus route.",
  ],
  [
    "src/components/feedback/dialog/dialog.css::.discern-dialog__panel",
    "The modal panel always contains its labelled Close button.",
  ],
  [
    "src/components/docs/search-palette/search-palette.css::.discern-search-palette__results",
    "Search results are reached through the search field and result links.",
  ],
  [
    "src/components/layout/overflow-cue/overflow-cue.css::.discern-overflow-cue__viewport",
    "OverflowCue owns its conditional region label and keyboard viewport contract.",
  ],
  [
    "src/components/layout/overflow-cue/overflow-cue.css::.discern-overflow-cue [data-discern-overflow-cue-target]",
    "OverflowCue descendant mode delegates focus semantics to the authored target.",
  ],
]);

function scrollableRules(css: string): readonly ScrollableRule[] {
  const rules: ScrollableRule[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gs)) {
    const selectors = match[1];
    const body = match[2];
    if (
      selectors === undefined || body === undefined ||
      !/\boverflow(?:-[xy])?\s*:\s*(?:auto|scroll)\b/.test(body)
    ) {
      continue;
    }
    for (const selector of selectors.split(",")) {
      const normalized = selector.trim();
      if (normalized !== "" && !normalized.startsWith("@")) {
        rules.push({ selector: normalized, source: body });
      }
    }
  }
  return rules;
}

function openingTagForSelector(
  componentSource: string,
  selector: string,
): string | undefined {
  const terminal = selector.trim().split(/\s+|>/).at(-1) ?? "";
  const tagName = terminal.match(/^([a-z][a-z0-9-]*)/i)?.[1];
  const className = [...terminal.matchAll(/\.([a-z0-9_-]+)/gi)].at(-1)?.[1];
  return [...componentSource.matchAll(/<[a-z][a-z0-9-]*\b[^>]*>/gis)]
    .map((match) => match[0])
    .find((opening) => {
      if (
        tagName !== undefined &&
        !new RegExp(`^<${tagName}\\b`, "i").test(opening)
      ) {
        return false;
      }
      return className === undefined || opening.includes(className);
    });
}

function contentViewportViolations(
  relativeCssPath: string,
  css: string,
  componentSource: string,
): readonly string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const { selector } of scrollableRules(css)) {
    const identity = `${relativeCssPath}::${selector}`;
    if (seen.has(identity) || descendantFocusPolicies.has(identity)) continue;
    seen.add(identity);
    const opening = openingTagForSelector(componentSource, selector);
    if (opening === undefined) {
      violations.push(`${identity} has no matching Component-owned element`);
      continue;
    }
    if (!/\btabIndex=\{0\}/.test(opening)) {
      violations.push(`${identity} is not keyboard focusable`);
    }
    if (!/\brole="group"/.test(opening)) {
      violations.push(`${identity} has no content-group semantics`);
    }
    if (!/\baria-(?:label|labelledby)=/.test(opening)) {
      violations.push(`${identity} has no accessible name`);
    }
    if (!css.includes(`${selector}:focus-visible`)) {
      violations.push(`${identity} has no visible focus treatment`);
    }
  }
  return violations;
}

async function componentDirectories(
  directory: string,
): Promise<readonly string[]> {
  const directories: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (!entry.isDirectory) continue;
    const path = join(directory, entry.name);
    const children = [...Deno.readDirSync(path)];
    if (
      children.some((child) => child.isFile && child.name.endsWith(".meta.ts"))
    ) {
      directories.push(path);
    } else {
      directories.push(...await componentDirectories(path));
    }
  }
  return directories;
}

Deno.test("every Component-owned scrollable content body is a named keyboard viewport", async () => {
  const violations: string[] = [];
  for (const directory of await componentDirectories(COMPONENT_ROOT)) {
    const slug = directory.split("/").at(-1);
    if (slug === undefined) continue;
    const cssPath = join(directory, `${slug}.css`);
    const componentPath = join(directory, `${slug}.tsx`);
    let css: string;
    let componentSource: string;
    try {
      [css, componentSource] = await Promise.all([
        Deno.readTextFile(cssPath),
        Deno.readTextFile(componentPath),
      ]);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) continue;
      throw error;
    }
    violations.push(
      ...contentViewportViolations(
        relative(PACKAGE_ROOT, cssPath),
        css,
        componentSource,
      ),
    );
  }
  assertEquals(violations, []);
});

Deno.test("a synthetic future overflow owner cannot escape the content-focus guard", () => {
  const css = `
    .discern-future-output__body {
      overflow: auto;
    }
  `;
  const unfocusable =
    '<pre className="discern-future-output__body"><code>{text}</code></pre>';
  assertEquals(
    contentViewportViolations(
      "src/components/future/future-output/future-output.css",
      css,
      unfocusable,
    ),
    [
      "src/components/future/future-output/future-output.css::.discern-future-output__body is not keyboard focusable",
      "src/components/future/future-output/future-output.css::.discern-future-output__body has no content-group semantics",
      "src/components/future/future-output/future-output.css::.discern-future-output__body has no accessible name",
      "src/components/future/future-output/future-output.css::.discern-future-output__body has no visible focus treatment",
    ],
  );

  const accessible =
    '<pre className="discern-future-output__body" role="group" aria-label="Scrollable future output" tabIndex={0}><code>{text}</code></pre>';
  assertEquals(
    contentViewportViolations(
      "src/components/future/future-output/future-output.css",
      `${css}
        .discern-future-output__body:focus-visible {
          outline: 2px solid var(--discern-color-accent-500);
        }
      `,
      accessible,
    ),
    [],
  );
});
