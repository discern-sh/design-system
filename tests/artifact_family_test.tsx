import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cssClassNames,
  cssDecodedIdentifiers,
  cssIdentifiers,
} from "../scripts/css-syntax.ts";
import { componentOwnedClassNames } from "../scripts/generate.ts";
import artifactCardMeta from "../src/components/workflow/artifact-card/artifact-card.meta.ts";
import artifactTreeMeta from "../src/components/workflow/artifact-tree/artifact-tree.meta.ts";
import decisionRecordMeta from "../src/components/workflow/decision-record/decision-record.meta.ts";
import fileChangeMeta from "../src/components/workflow/file-change/file-change.meta.ts";
import ownershipBadgeMeta from "../src/components/workflow/ownership-badge/ownership-badge.meta.ts";
import ruleMeta from "../src/components/workflow/rule/rule.meta.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import {
  type RuntimeCssSurface,
  runtimeCssSurfaceRegistry,
} from "../src/runtime.ts";
import type { ArtifactTreeNode } from "../src/react.ts";
import {
  ArtifactCard,
  artifactOwnerships,
  ArtifactTree,
  DecisionRecord,
  decisionRecordStatuses,
  FileChange,
  fileDispositions,
  OwnershipBadge,
  Rule,
} from "../src/react.ts";

function canonicalLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function declarationBlocks(
  css: string,
  selector: string,
): readonly string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) =>
    match[1]?.trim() === selector ? [match[2] ?? ""] : []
  );
}

function colorTokens(blocks: readonly string[]): ReadonlySet<string> {
  return new Set(
    blocks.flatMap((block) =>
      [...block.matchAll(/(?:^|;)\s*color\s*:\s*var\((--[^)]+)\)/g)]
        .map((match) => match[1] ?? "")
    ).filter(Boolean),
  );
}

function dispositionTokenFailures(
  css: string,
  dispositions: readonly string[],
  expected: Readonly<Record<string, string>>,
): readonly string[] {
  const baseTokens = colorTokens(
    declarationBlocks(css, ".discern-file-change__state"),
  );
  const failures: string[] = [];
  for (const disposition of dispositions) {
    const overrideTokens = colorTokens(
      declarationBlocks(
        css,
        `.discern-file-change[data-discern-disposition="${disposition}"] .discern-file-change__state`,
      ),
    );
    const tokens = overrideTokens.size > 0 ? overrideTokens : baseTokens;
    const token = expected[disposition];
    if (token === undefined || tokens.size !== 1 || !tokens.has(token)) {
      failures.push(
        `${disposition}: expected ${token ?? "a declared token"}, found ${
          [...tokens].join(", ") || "no explicit token"
        }`,
      );
    }
  }
  return failures;
}

function prohibitedFileChangeSemanticTokens(
  css: string,
): readonly string[] {
  return cssIdentifiers(css).filter((identifier) =>
    /^--discern-color-(?:danger|warning)(?:-|$)/.test(identifier)
  );
}

function foreignFileChangeStylesheetReferences(
  surfaces: readonly RuntimeCssSurface[],
): readonly string[] {
  const owner = surfaces.find(({ componentId }) =>
    componentId === "file-change"
  );
  if (owner === undefined) return ["file-change owner stylesheet is missing"];
  const ownedClasses = owner.ownedClasses.filter((name) =>
    name === "discern-file-change" ||
    name.startsWith("discern-file-change__") ||
    name.startsWith("discern-file-change--")
  );
  const owned = new Set(ownedClasses.map((name) => name.toLowerCase()));
  return surfaces.flatMap((surface) => {
    if (surface.id === owner.id) return [];
    const referencesOwner = cssDecodedIdentifiers(surface.css)
      .some((name) => owned.has(name.toLowerCase() as `discern-${string}`));
    return referencesOwner
      ? [`${surface.id} references a FileChange-owned class`]
      : [];
  });
}

// WHATWG HTML Living Standard, "Index of elements" and "Phrasing content",
// reviewed 2026-07-27:
// https://html.spec.whatwg.org/multipage/indices.html
const FLOW_CONTENT_ELEMENTS = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "br",
  "button",
  "canvas",
  "cite",
  "code",
  "data",
  "datalist",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "em",
  "embed",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "main",
  "map",
  "mark",
  "math",
  "menu",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "script",
  "search",
  "section",
  "select",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "svg",
  "table",
  "template",
  "textarea",
  "time",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

const PHRASING_CONTENT_ELEMENTS = new Set([
  "a",
  "abbr",
  "audio",
  "b",
  "bdi",
  "bdo",
  "br",
  "button",
  "canvas",
  "cite",
  "code",
  "data",
  "datalist",
  "del",
  "dfn",
  "em",
  "embed",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "map",
  "mark",
  "math",
  "meter",
  "noscript",
  "object",
  "output",
  "picture",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "script",
  "select",
  "selectedcontent",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "svg",
  "template",
  "textarea",
  "time",
  "u",
  "var",
  "video",
  "wbr",
]);

const FLOW_BUT_NOT_PHRASING_ELEMENTS = new Set(
  [...FLOW_CONTENT_ELEMENTS].filter((tag) =>
    !PHRASING_CONTENT_ELEMENTS.has(tag)
  ),
);

const PHRASING_CONTENT_MODELS = new Set([
  "abbr",
  "b",
  "bdi",
  "bdo",
  "button",
  "cite",
  "code",
  "data",
  "datalist",
  "dfn",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "kbd",
  "label",
  "mark",
  "meter",
  "output",
  "p",
  "pre",
  "progress",
  "q",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "textarea",
  "time",
  "u",
  "var",
]);

const PHRASING_OR_HEADING_CONTENT_MODELS = new Set([
  "legend",
  "summary",
]);

const HEADING_CONTENT_ELEMENTS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hgroup",
]);

function invalidPhrasingFlowNesting(html: string): readonly string[] {
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
  ]);
  const stack: string[] = [];
  const failures: string[] = [];
  for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const closing = match[1] === "/";
    const tag = (match[2] ?? "").toLowerCase();
    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const restrictedAncestor = stack.findLast((ancestor) =>
      PHRASING_CONTENT_MODELS.has(ancestor) ||
      PHRASING_OR_HEADING_CONTENT_MODELS.has(ancestor)
    );
    if (
      restrictedAncestor !== undefined &&
      FLOW_BUT_NOT_PHRASING_ELEMENTS.has(tag) &&
      !(
        PHRASING_OR_HEADING_CONTENT_MODELS.has(restrictedAncestor) &&
        HEADING_CONTENT_ELEMENTS.has(tag)
      )
    ) {
      failures.push(`${restrictedAncestor} cannot contain ${tag}`);
    }
    if (!voidTags.has(tag) && !match[0].endsWith("/>")) stack.push(tag);
  }
  return failures;
}

Deno.test("the Artifact family occupies its reserved Workflow order band", () => {
  assertEquals(
    [
      artifactTreeMeta,
      fileChangeMeta,
      artifactCardMeta,
      ownershipBadgeMeta,
      decisionRecordMeta,
      ruleMeta,
    ].map(({ slug, group, order }) => ({ slug, group, order })),
    [
      { slug: "artifact-tree", group: "Workflow", order: 310 },
      { slug: "file-change", group: "Workflow", order: 320 },
      { slug: "artifact-card", group: "Workflow", order: 330 },
      { slug: "ownership-badge", group: "Workflow", order: 340 },
      { slug: "decision-record", group: "Workflow", order: 350 },
      { slug: "rule", group: "Workflow", order: 360 },
    ],
  );
});

Deno.test("every canonical ownership and disposition is a visible text label", () => {
  for (const ownership of artifactOwnerships) {
    const markup = renderToStaticMarkup(
      <OwnershipBadge ownership={ownership} />,
    );
    assertStringIncludes(
      markup,
      `data-discern-ownership="${ownership}"`,
    );
    assertStringIncludes(markup, `>${canonicalLabel(ownership)}</span>`);
  }

  for (const disposition of fileDispositions) {
    const markup = renderToStaticMarkup(
      <FileChange path="/workspace/example.ts" disposition={disposition} />,
    );
    assertStringIncludes(
      markup,
      `data-discern-disposition="${disposition}"`,
    );
    assertStringIncludes(
      markup,
      `</span>${canonicalLabel(disposition)}</span>`,
    );
    assertStringIncludes(markup, "/workspace/example.ts");
  }
});

Deno.test("every file disposition has its complete semantic token mapping", async () => {
  const css = await Deno.readTextFile(
    new URL(
      "../src/components/workflow/file-change/file-change.css",
      import.meta.url,
    ),
  );
  const expected = {
    added: "--discern-color-success-deep",
    updated: "--discern-color-accent-700",
    generated: "--discern-color-ink-muted",
    removed: "--discern-color-ink-muted",
    unchanged: "--discern-color-ink-muted",
  } as const satisfies Readonly<
    Record<(typeof fileDispositions)[number], string>
  >;
  assertEquals(
    dispositionTokenFailures(css, fileDispositions, expected),
    [],
  );
  assertEquals(prohibitedFileChangeSemanticTokens(css), []);
  assertEquals(
    foreignFileChangeStylesheetReferences(runtimeCssSurfaceRegistry),
    [],
  );
  assertEquals(
    runtimeCssSurfaceRegistry.flatMap(({ componentId }) =>
      componentId === undefined ? [] : [componentId]
    ),
    componentRegistry.map(({ meta }) => meta.slug),
  );
  const wrongPositiveState = `
    .discern-file-change__state {
      color: var(--discern-color-ink-muted);
    }
    .discern-file-change[data-discern-disposition="added"] .discern-file-change__state {
      color: var(--discern-color-danger);
    }
  `;
  assertEquals(
    dispositionTokenFailures(wrongPositiveState, ["added"], expected),
    [
      "added: expected --discern-color-success-deep, found --discern-color-danger",
    ],
  );
  assertEquals(
    prohibitedFileChangeSemanticTokens(wrongPositiveState),
    ["--discern-color-danger"],
  );

  for (
    const selector of [
      ".future-entry[data-discern-disposition=removed]",
      ".future-entry[ data-discern-disposition = 'removed' s ]",
      ".future-entry[data-discern-dispositio\\6e =\\72 emoved]",
      ":is(.future-entry, .future-card)[data-discern-disposition=removed]",
      ".discern-file-change:not([data-discern-disposition=added])",
      ".discern-file-change:not([data-discern-disposition=generated], [data-discern-disposition=removed], [data-discern-disposition=unchanged])",
      ".discern-file-change[data-discern-disposition=added][data-discern-disposition=removed]",
      ".future-card:has([data-discern-disposition=removed])",
    ]
  ) {
    const mutation = `
      ${selector} {
        background: var(--discern-color-danger-soft);
        border-color: var(--discern-color-warning);
      }
    `;
    assertEquals(
      prohibitedFileChangeSemanticTokens(mutation),
      ["--discern-color-danger-soft", "--discern-color-warning"],
      `${selector} escaped the component-wide semantic-token invariant`,
    );
  }

  for (
    const [token, decoded] of [
      ["--discern-color-dang\\65 r", "--discern-color-danger"],
      ["--discern-color-\\77 arning-soft", "--discern-color-warning-soft"],
      ["--discern-c\\6f lor-danger", "--discern-color-danger"],
    ] as const
  ) {
    assertEquals(
      prohibitedFileChangeSemanticTokens(
        `.discern-file-change { color: var(${token}); }`,
      ),
      [decoded],
      `${token} escaped semantic-token decoding`,
    );
  }

  const foreignTemplate = runtimeCssSurfaceRegistry.find(({ componentId }) =>
    componentId === "artifact-card"
  );
  assert(foreignTemplate !== undefined);
  for (
    const selector of [
      ".discern-file-change",
      ".\\64 iscern-file-change",
      '[class~="discern-file-change"]',
      '[class~="DISCERN-FILE-CHANGE" i]',
      '[cl\\61 ss~="\\44 ISCERN-FILE-CHANGE" i]',
      '[class="discern-file-change"]',
      '[class="future-entry discern-file-change__state future-state"]',
      "[CLASS=discern-file-change]",
      '[cl\\61 ss="\\64 iscern-file-change"]',
      '[CLASS="DISCERN-FILE-CHANGE future-entry" i]',
      "@scope (.discern-file-change) { :scope",
      '@scope ([class~="DISCERN-FILE-CHANGE" i]) { :scope',
      '@scope ([class="future-entry discern-file-change"]) { :scope',
    ]
  ) {
    const foreign = {
      ...foreignTemplate,
      id: "component:future-surface",
      componentId: "future-surface",
      css: `${selector} { color: inherit; }${
        selector.startsWith("@scope") ? " }" : ""
      }\n`,
    } satisfies RuntimeCssSurface;
    assertEquals(
      foreignFileChangeStylesheetReferences([
        ...runtimeCssSurfaceRegistry,
        foreign,
      ]),
      ["component:future-surface references a FileChange-owned class"],
      `${selector} escaped the registry-wide owner boundary`,
    );
  }
  assertEquals(
    cssClassNames(
      "@scope (.\\64 iscern-file-change) { :scope { color: inherit; } }",
    ),
    ["discern-file-change"],
  );
  assertEquals(
    cssClassNames(
      '[class~="discern-file-change"] {} ' +
        '[class~="DISCERN-FILE-CHANGE" i] {} ' +
        "[cl\\61 ss~=discern-file-change__state] {}",
    ),
    ["discern-file-change", "discern-file-change__state"],
  );
  assertEquals(
    cssClassNames(
      '[class="discern-file-change"] {} ' +
        '[class="future-entry discern-file-change__state future-state"] {} ' +
        "[CLASS=discern-file-change--future] {} " +
        '[cl\\61 ss="\\64 iscern-file-change\\20 discern-file-change__escaped"] {} ' +
        '[CLASS="DISCERN-FILE-CHANGE FUTURE-ENTRY" i] {} ' +
        '[class="DISCERN-FILE-CHANGE--STRICT" s] {}',
    ),
    [
      "DISCERN-FILE-CHANGE--STRICT",
      "discern-file-change",
      "discern-file-change--future",
      "discern-file-change__escaped",
      "discern-file-change__state",
      "future-entry",
      "future-state",
    ],
  );
  assertEquals(
    cssClassNames(
      '/* .discern-file-change */ [data-label="discern-file-change"] {} ' +
        '[data-tags~="discern-file-change"] {} ' +
        '[data-tags="discern-file-change"] {} ' +
        "[class] {} " +
        '[class^="discern-file-change"] {} ' +
        '[class$="discern-file-change"] {} ' +
        '[class*="discern-file-change"] {} ' +
        '[class|="discern-file-change"] {} ' +
        ".discern-file-change-extra {}",
    ),
    ["discern-file-change-extra"],
  );
  assertEquals(
    componentOwnedClassNames(
      '[class="future-entry discern-file-change__future"] {} ' +
        "[CLASS=discern-file-change--exact] {} " +
        '[data-tags~="discern-file-change__foreign"] {}',
    ),
    ["discern-file-change--exact", "discern-file-change__future"],
  );

  const ownerSurface = runtimeCssSurfaceRegistry.find(({ componentId }) =>
    componentId === "file-change"
  );
  assert(ownerSurface !== undefined);
  for (
    const enrolled of runtimeCssSurfaceRegistry.filter(({ id }) =>
      id !== ownerSurface.id
    )
  ) {
    const mutated = runtimeCssSurfaceRegistry.map((surface) =>
      surface.id === enrolled.id
        ? {
          ...surface,
          css:
            `${surface.css}\n[class~="discern-file-change"] { color: inherit; }\n`,
        }
        : surface
    );
    assertEquals(
      foreignFileChangeStylesheetReferences(mutated),
      [`${enrolled.id} references a FileChange-owned class`],
      `${enrolled.id} escaped the emitted-surface owner boundary`,
    );
  }

  const harmless = {
    ...foreignTemplate,
    id: "component:near-name",
    componentId: "near-name",
    css: "/* discern-file-change DISCERN-FILE-CHANGE */ " +
      ".DISCERN-FILE-CHANGE-EXTRA { color: inherit; }",
  } satisfies RuntimeCssSurface;
  assertEquals(
    foreignFileChangeStylesheetReferences([
      ...runtimeCssSurfaceRegistry,
      harmless,
    ]),
    [],
  );
});

Deno.test("Artifact tree renders six nested directory levels and preserves the exact long path", () => {
  const filename =
    "generated-component-registry-with-a-purposeful-long-name.tsx";
  assertEquals(filename.length, 60);
  const levels = [
    "workspace",
    "packages",
    "catalogue",
    "generated",
    "components",
    "workflow",
  ] as const;
  const path = `/${levels.join("/")}/${filename}`;
  let node: ArtifactTreeNode = {
    name: filename,
    path,
    kind: "file",
    annotation: <OwnershipBadge ownership="generated" />,
  };
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const name = levels[index];
    if (name === undefined) continue;
    node = {
      name,
      path: `/${levels.slice(0, index + 1).join("/")}`,
      kind: "directory",
      children: [node],
    };
  }

  const markup = renderToStaticMarkup(
    <ArtifactTree label="Deep project tree" nodes={[node]} />,
  );
  assertEquals(markup.match(/<ul/g)?.length, 7);
  assertEquals(markup.match(/<li/g)?.length, 7);
  assertEquals(
    markup.match(/data-discern-kind="directory"/g)?.length,
    6,
  );
  assertEquals(markup.match(/data-discern-kind="file"/g)?.length, 1);
  assertStringIncludes(markup, `title="${path}"`);
  assertStringIncludes(markup, `File: ${path}`);
  assertStringIncludes(markup, "Generated");
});

Deno.test("Artifact tree annotations accept inline and flow compositions without invalid nesting", () => {
  const ownership = renderToStaticMarkup(
    <ArtifactTree
      nodes={[{
        name: "instructions.md",
        kind: "file",
        annotation: <OwnershipBadge ownership="authored" />,
      }]}
    />,
  );
  const fileChange = renderToStaticMarkup(
    <ArtifactTree
      nodes={[{
        name: "instructions.md",
        kind: "file",
        annotation: (
          <FileChange
            path="/workspace/instructions.md"
            disposition="updated"
          />
        ),
      }]}
    />,
  );
  assertEquals(invalidPhrasingFlowNesting(ownership), []);
  assertEquals(invalidPhrasingFlowNesting(fileChange), []);

  assertEquals(
    invalidPhrasingFlowNesting(
      '<mark class="future-note"><section>Flow content</section></mark>',
    ),
    ["mark cannot contain section"],
  );
  assertEquals(
    invalidPhrasingFlowNesting(
      "<button><div>Future flow composition</div></button>",
    ),
    ["button cannot contain div"],
  );
  assertEquals(
    invalidPhrasingFlowNesting("<a><div>Flow link</div></a>"),
    [],
  );
  assertEquals(
    invalidPhrasingFlowNesting(
      "<p><a><div>Flow link in a paragraph</div></a></p>",
    ),
    ["p cannot contain div"],
  );
  assertEquals(
    invalidPhrasingFlowNesting("<summary><h2>Heading</h2></summary>"),
    [],
  );
  for (const container of PHRASING_CONTENT_MODELS) {
    assertEquals(
      invalidPhrasingFlowNesting(
        `<${container}><div>Future flow composition</div></${container}>`,
      ),
      [`${container} cannot contain div`],
      container,
    );
  }
});

Deno.test("artifact, decision, and rule surfaces expose their source semantics", () => {
  const artifact = renderToStaticMarkup(
    <ArtifactCard
      name="Component registry"
      path="/workspace/generated/registry.ts"
      summary="Stable generated index."
      ownership="generated"
      provenance="Generated from components.ts"
      sourceLink={<a href="/components.ts">View source</a>}
    />,
  );
  assertStringIncludes(artifact, "<article");
  assertStringIncludes(artifact, "<h3>Component registry</h3>");
  assertStringIncludes(artifact, "<dl");
  assertStringIncludes(artifact, "Ownership");
  assertStringIncludes(artifact, "Generated");
  assertStringIncludes(artifact, "Provenance");
  assertStringIncludes(artifact, "Source");

  for (const status of decisionRecordStatuses) {
    const decision = renderToStaticMarkup(
      <DecisionRecord
        identifier="ADR 0012"
        title="Keep one source"
        status={status}
        date="2026-04-14"
        context="Repeated facts drift."
        decision="Generate every derived surface."
        consequences="Authored metadata becomes the edit point."
      />,
    );
    assertStringIncludes(decision, `data-discern-status="${status}"`);
    assertStringIncludes(decision, `>${canonicalLabel(status)}</span>`);
    assertStringIncludes(decision, '<time dateTime="2026-04-14">');
    const context = decision.indexOf("<h4>Context</h4>");
    const resolution = decision.indexOf("<h4>Decision</h4>");
    const consequences = decision.indexOf("<h4>Consequences</h4>");
    assert(context >= 0);
    assert(context < resolution);
    assert(resolution < consequences);
  }

  const rule = renderToStaticMarkup(
    <Rule origin="AGENTS.md" scope="Every change">
      Commit generated outputs with their source.
    </Rule>,
  );
  assertStringIncludes(rule, "<article");
  assertStringIncludes(rule, "<dl");
  assertStringIncludes(rule, "<dt>Origin</dt><dd>AGENTS.md</dd>");
  assertStringIncludes(rule, "<dt>Scope</dt><dd>Every change</dd>");
  assert(!rule.includes('role="alert"'));
});
