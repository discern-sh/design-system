import { assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import { registry } from "../catalogue/generated/registry.ts";
import type { ResolvedComponentReviewPosture } from "../catalogue/review-postures.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));
const COMPONENT_ROOT = join(PACKAGE_ROOT, "src", "components");

function capturesPointerContact(
  posture: ResolvedComponentReviewPosture,
): boolean {
  let pointerIsDown = false;
  for (const entry of posture.sequence) {
    if ("checkpoint" in entry) {
      if (pointerIsDown) return true;
      continue;
    }
    if (!("action" in entry)) continue;
    if (entry.action === "pointer-down") pointerIsDown = true;
    if (entry.action === "pointer-up") pointerIsDown = false;
  }
  return false;
}

function activeStateReviewViolations(
  activeStateSlugs: ReadonlySet<string>,
  pointerContactSlugs: ReadonlySet<string>,
): readonly string[] {
  return [...activeStateSlugs]
    .filter((slug) => !pointerContactSlugs.has(slug))
    .map((slug) => slug + " has :active styling but no pointer-contact review")
    .toSorted();
}

function visibleValidationProxyViolations(
  stylesheets: ReadonlyMap<string, string>,
  validationCapablePaths: ReadonlySet<string> = new Set(stylesheets.keys()),
): readonly string[] {
  const violations: string[] = [];
  for (const [path, css] of stylesheets) {
    if (!validationCapablePaths.has(path)) continue;
    const proxySelectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gs)]
      .filter((match) => /--discern-focus-proxy\s*:\s*1\b/.test(match[2] ?? ""))
      .flatMap((match) => (match[1] ?? "").split(","))
      .map((selector) => selector.trim())
      .filter((selector) => selector !== "");
    for (const proxySelector of proxySelectors) {
      const proxyClass = [...proxySelector.matchAll(/\.([a-z0-9_-]+)/gi)].at(-1)
        ?.[1];
      if (proxyClass === undefined) continue;
      const hasSemanticInvalidRule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gs)]
        .some((match) => {
          const selectors = match[1] ?? "";
          const body = match[2] ?? "";
          return selectors.includes('[aria-invalid="true"]') &&
            selectors.includes(`.${proxyClass}`) &&
            /border-width\s*:\s*(?:2|[3-9]|[1-9][0-9]+)px\b/.test(body) &&
            /border(?:-color)?\s*:\s*var\(--discern-color-danger\)/.test(body);
        });
      if (!hasSemanticInvalidRule) {
        violations.push(
          `${path}::${proxySelector} hides the native control but has no shaped danger validation state`,
        );
      }
    }
  }
  return violations.toSorted();
}

async function validationCapableStylesheetPaths(
  stylesheets: ReadonlyMap<string, string>,
): Promise<ReadonlySet<string>> {
  const paths = new Set<string>();
  for (const path of stylesheets.keys()) {
    const examplesPath = join(
      PACKAGE_ROOT,
      path.replace(/\.css$/, ".examples.tsx"),
    );
    try {
      if (
        /\bid\s*:\s*["']validation-error["']/.test(
          await Deno.readTextFile(examplesPath),
        )
      ) {
        paths.add(path);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return paths;
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

Deno.test("every authored pressed state has a named pointer-contact review checkpoint", async () => {
  const activeStateSlugs = new Set<string>();
  for (const [path, css] of await componentStylesheets(COMPONENT_ROOT)) {
    if (/:active\b/.test(css)) {
      activeStateSlugs.add(path.split("/").at(-2) ?? "");
    }
  }
  const pointerContactSlugs = new Set(
    registry
      .filter((entry) => entry.reviewPostures.some(capturesPointerContact))
      .map((entry) => entry.meta.slug),
  );
  assertEquals(
    activeStateReviewViolations(activeStateSlugs, pointerContactSlugs),
    [],
  );
});

Deno.test("a synthetic future pressed state cannot escape perceptual review", () => {
  assertEquals(
    activeStateReviewViolations(
      new Set(["future-action"]),
      new Set(),
    ),
    ["future-action has :active styling but no pointer-contact review"],
  );
  assertEquals(
    activeStateReviewViolations(
      new Set(["future-action"]),
      new Set(["future-action"]),
    ),
    [],
  );
});

Deno.test("Component motion names the properties it changes", async () => {
  const violations: string[] = [];
  for (const [path, css] of await componentStylesheets(COMPONENT_ROOT)) {
    if (/\btransition(?:-property)?\s*:[^;{}]*\ball\b/.test(css)) {
      violations.push(path);
    }
  }
  assertEquals(violations, []);
  assertEquals(
    /\btransition(?:-property)?\s*:[^;{}]*\ball\b/.test(
      ".discern-future-action { transition: all 150ms; }",
    ),
    true,
    "the future-member detector must recognize a blanket transition",
  );
});

Deno.test("every visible native-control proxy carries a semantic invalid state", async () => {
  const stylesheets = await componentStylesheets(COMPONENT_ROOT);
  assertEquals(
    visibleValidationProxyViolations(
      stylesheets,
      await validationCapableStylesheetPaths(stylesheets),
    ),
    [],
  );
});

Deno.test("a synthetic future control proxy cannot hide validation", () => {
  const path = "src/components/future/future-choice/future-choice.css";
  const unguarded = new Map([[
    path,
    `
    .discern-future-choice__proxy {
      --discern-focus-proxy: 1;
      border: 1px solid var(--discern-color-border);
    }
  `,
  ]]);
  assertEquals(visibleValidationProxyViolations(unguarded), [
    `${path}::.discern-future-choice__proxy hides the native control but has no shaped danger validation state`,
  ]);
  assertEquals(
    visibleValidationProxyViolations(
      new Map([[
        path,
        `
      ${unguarded.get(path)}
      .discern-future-choice input[aria-invalid="true"] + .discern-future-choice__proxy {
        border-width: 2px;
        border-color: var(--discern-color-danger);
      }
    `,
      ]]),
    ),
    [],
  );
});
