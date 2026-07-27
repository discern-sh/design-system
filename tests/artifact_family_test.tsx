import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import artifactCardMeta from "../src/components/workflow/artifact-card/artifact-card.meta.ts";
import artifactTreeMeta from "../src/components/workflow/artifact-tree/artifact-tree.meta.ts";
import decisionRecordMeta from "../src/components/workflow/decision-record/decision-record.meta.ts";
import fileChangeMeta from "../src/components/workflow/file-change/file-change.meta.ts";
import ownershipBadgeMeta from "../src/components/workflow/ownership-badge/ownership-badge.meta.ts";
import ruleMeta from "../src/components/workflow/rule/rule.meta.ts";
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

interface AttributeConstraint {
  readonly caseInsensitive: boolean;
  readonly name: string;
  readonly operator: "" | "=" | "~=" | "|=" | "^=" | "$=" | "*=";
  readonly value: string | undefined;
}

function cssEscapeEnd(value: string, start: number): number {
  let position = start + 1;
  if (position >= value.length) return position;
  if (/[0-9a-f]/i.test(value[position] ?? "")) {
    let digits = 0;
    while (
      position < value.length && digits < 6 &&
      /[0-9a-f]/i.test(value[position] ?? "")
    ) {
      position += 1;
      digits += 1;
    }
    if (/\s/.test(value[position] ?? "")) position += 1;
    return position;
  }
  if (value[position] === "\r" && value[position + 1] === "\n") {
    return position + 2;
  }
  return position + 1;
}

function decodeCssEscapes(value: string): string {
  let decoded = "";
  let position = 0;
  while (position < value.length) {
    const character = value[position];
    if (character !== "\\") {
      decoded += character ?? "";
      position += 1;
      continue;
    }
    const escapeEnd = cssEscapeEnd(value, position);
    const escaped = value.slice(position + 1, escapeEnd);
    const hexadecimal = escaped.match(/^([0-9a-f]{1,6})/i)?.[1];
    if (hexadecimal !== undefined) {
      const codePoint = Number.parseInt(hexadecimal, 16);
      decoded += codePoint === 0 || codePoint > 0x10ffff
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    } else if (!/^[\r\n\f]/.test(escaped)) {
      decoded += escaped[0] ?? "";
    }
    position = escapeEnd;
  }
  return decoded;
}

function splitSelectorList(selectorList: string): readonly string[] {
  const selectors: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let position = 0;
  let quote: "'" | '"' | undefined;
  while (position < selectorList.length) {
    const character = selectorList[position];
    if (character === "\\") {
      position = cssEscapeEnd(selectorList, position);
      continue;
    }
    if (quote !== undefined) {
      if (character === quote) quote = undefined;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (character === "(") {
      parenthesisDepth += 1;
    } else if (character === ")") {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    } else if (
      character === "," && bracketDepth === 0 && parenthesisDepth === 0
    ) {
      selectors.push(selectorList.slice(start, position).trim());
      start = position + 1;
    }
    position += 1;
  }
  selectors.push(selectorList.slice(start).trim());
  return selectors.filter(Boolean);
}

function attributeSelectorContents(selector: string): readonly string[] {
  const contents: string[] = [];
  let position = 0;
  while (position < selector.length) {
    if (selector[position] === "\\") {
      position = cssEscapeEnd(selector, position);
      continue;
    }
    if (selector[position] !== "[") {
      position += 1;
      continue;
    }
    const start = position + 1;
    position = start;
    let quote: "'" | '"' | undefined;
    while (position < selector.length) {
      const character = selector[position];
      if (character === "\\") {
        position = cssEscapeEnd(selector, position);
        continue;
      }
      if (quote !== undefined) {
        if (character === quote) quote = undefined;
      } else if (character === "'" || character === '"') {
        quote = character;
      } else if (character === "]") {
        contents.push(selector.slice(start, position));
        position += 1;
        break;
      }
      position += 1;
    }
  }
  return contents;
}

function parseAttributeConstraint(
  content: string,
): AttributeConstraint | undefined {
  let position = 0;
  const skipWhitespace = (): void => {
    while (/\s/.test(content[position] ?? "")) position += 1;
  };
  const readToken = (stops: RegExp): string => {
    const start = position;
    while (position < content.length) {
      if (content[position] === "\\") {
        position = cssEscapeEnd(content, position);
      } else if (stops.test(content[position] ?? "")) {
        break;
      } else {
        position += 1;
      }
    }
    return content.slice(start, position);
  };
  skipWhitespace();
  const rawName = readToken(/[\s~|^$*=\]]/);
  if (rawName === "") return undefined;
  const name = decodeCssEscapes(rawName).toLowerCase();
  skipWhitespace();
  if (position >= content.length) {
    return {
      caseInsensitive: false,
      name,
      operator: "",
      value: undefined,
    };
  }
  const twoCharacterOperator = content.slice(position, position + 2);
  const operator = ["~=", "|=", "^=", "$=", "*="].includes(
      twoCharacterOperator,
    )
    ? twoCharacterOperator as AttributeConstraint["operator"]
    : content[position] === "="
    ? "="
    : undefined;
  if (operator === undefined) return undefined;
  position += operator.length;
  skipWhitespace();
  let rawValue = "";
  const quote = content[position];
  if (quote === "'" || quote === '"') {
    position += 1;
    const start = position;
    while (position < content.length && content[position] !== quote) {
      position = content[position] === "\\"
        ? cssEscapeEnd(content, position)
        : position + 1;
    }
    if (content[position] !== quote) return undefined;
    rawValue = content.slice(start, position);
    position += 1;
  } else {
    rawValue = readToken(/\s/);
  }
  if (rawValue === "") return undefined;
  skipWhitespace();
  let caseInsensitive = false;
  if (/[is]/i.test(content[position] ?? "")) {
    caseInsensitive = content[position]?.toLowerCase() === "i";
    position += 1;
    skipWhitespace();
  }
  if (position !== content.length) return undefined;
  return {
    caseInsensitive,
    name,
    operator,
    value: decodeCssEscapes(rawValue),
  };
}

function constraintMatches(
  constraint: AttributeConstraint,
  disposition: string,
): boolean {
  if (constraint.operator === "") return true;
  const rawExpected = constraint.value;
  if (rawExpected === undefined) return false;
  const actual = constraint.caseInsensitive
    ? disposition.toLowerCase()
    : disposition;
  const expected = constraint.caseInsensitive
    ? rawExpected.toLowerCase()
    : rawExpected;
  switch (constraint.operator) {
    case "=":
      return actual === expected;
    case "~=":
      return actual.split(/\s+/).includes(expected);
    case "|=":
      return actual === expected || actual.startsWith(`${expected}-`);
    case "^=":
      return actual.startsWith(expected);
    case "$=":
      return actual.endsWith(expected);
    case "*=":
      return actual.includes(expected);
  }
}

function selectorDispositionConstraints(
  selector: string,
): readonly AttributeConstraint[] {
  return attributeSelectorContents(selector).flatMap((content) => {
    const constraint = parseAttributeConstraint(content);
    return constraint?.name === "data-discern-disposition" ? [constraint] : [];
  });
}

function constrainedDispositions(
  selector: string,
  dispositions: readonly string[],
): readonly string[] | undefined {
  const constraints = selectorDispositionConstraints(selector);
  if (constraints.length === 0) return undefined;
  return dispositions.filter((disposition) =>
    constraints.some((constraint) => constraintMatches(constraint, disposition))
  );
}

function dispositionTokenFailures(
  css: string,
  dispositions: readonly string[],
  expected: Readonly<Record<string, string>>,
): readonly string[] {
  const baseTokens = new Set(
    [
      ...css.matchAll(
        /(?:^|})\s*\.discern-file-change__state\s*\{([^}]*)\}/g,
      ),
    ].flatMap((match) =>
      [...(match[1] ?? "").matchAll(/color:\s*var\((--[^)]+)\)/g)].map(
        (color) => color[1] ?? "",
      )
    ).filter(Boolean),
  );
  const failures: string[] = [];
  for (const disposition of dispositions) {
    const overrideTokens = new Set(
      [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((match) => {
        const applies = splitSelectorList(match[1] ?? "").some((selector) =>
          constrainedDispositions(selector, dispositions)?.includes(
            disposition,
          ) === true
        );
        return applies
          ? [...(match[2] ?? "").matchAll(
            /(?:^|;)\s*color\s*:\s*var\((--[^)]+)\)/g,
          )].map((color) => color[1] ?? "")
          : [];
      }).filter(Boolean),
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

function neutralDispositionTreatmentFailures(
  css: string,
  dispositions: readonly string[],
  expected: Readonly<Record<string, string>>,
): readonly string[] {
  const neutralDispositions = dispositions.filter((disposition) =>
    expected[disposition] === "--discern-color-ink-muted"
  );
  const failures: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorList = match[1]?.trim() ?? "";
    const block = match[2] ?? "";
    for (
      const declaration of block.matchAll(
        /([-\w]+)\s*:\s*([^;}]*)/g,
      )
    ) {
      const property = declaration[1] ?? "";
      const value = declaration[2] ?? "";
      const hazardTokens = [
        ...value.matchAll(
          /--discern-color-(?:danger|warning)(?:-[\w-]+)?/g,
        ),
      ].map((token) => token[0]);
      if (hazardTokens.length === 0) continue;
      for (const selector of splitSelectorList(selectorList)) {
        const constrained = constrainedDispositions(
          selector,
          neutralDispositions,
        );
        const appliesTo = constrained === undefined
          ? selector.includes(".discern-file-change") ? neutralDispositions : []
          : constrained;
        for (const disposition of appliesTo) {
          for (const token of hazardTokens) {
            failures.push(
              `${disposition}: ${property} references ${token} in ${selector}`,
            );
          }
        }
      }
    }
  }
  return failures;
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
  assertEquals(
    neutralDispositionTreatmentFailures(css, fileDispositions, expected),
    [],
  );

  const wrongColor = `
    .future-entry[data-discern-disposition="removed"] .future-state {
      color: var(--discern-color-danger);
    }
  `;
  assertEquals(
    dispositionTokenFailures(wrongColor, ["removed"], expected),
    [
      "removed: expected --discern-color-ink-muted, found --discern-color-danger",
    ],
  );

  const wrongTreatment = `
    .future-entry[data-discern-disposition="removed"] .future-state {
      background: var(--discern-color-danger-soft);
      border-color: var(--discern-color-warning);
    }
  `;
  assertEquals(
    neutralDispositionTreatmentFailures(
      wrongTreatment,
      fileDispositions,
      expected,
    ),
    [
      'removed: background references --discern-color-danger-soft in .future-entry[data-discern-disposition="removed"] .future-state',
      'removed: border-color references --discern-color-warning in .future-entry[data-discern-disposition="removed"] .future-state',
    ],
  );

  const neutralDispositions = fileDispositions.filter((disposition) =>
    expected[disposition] === "--discern-color-ink-muted"
  );
  const escaped = (disposition: string): string =>
    `\\${disposition.codePointAt(0)?.toString(16)} ${disposition.slice(1)}`;
  for (const disposition of neutralDispositions) {
    const forms = [
      {
        name: "unquoted",
        selector:
          `.future-entry[data-discern-disposition=${disposition}] .future-state`,
        matches: 1,
      },
      {
        name: "quoted with whitespace",
        selector:
          `.future-entry[ data-discern-disposition = '${disposition}' s ] .future-state`,
        matches: 1,
      },
      {
        name: "compound selector",
        selector:
          `.future-entry.future-compact[data-kind=change][data-discern-disposition="${disposition}"] > .future-state`,
        matches: 1,
      },
      {
        name: "nested selector list",
        selector:
          `:is(.future-entry, .future-card)[data-discern-disposition=${disposition}] .future-state`,
        matches: 1,
      },
      {
        name: "top-level selector list",
        selector:
          `.future-a[data-discern-disposition=${disposition}], :where(.future-b, .future-c)[data-discern-disposition="${disposition}"]`,
        matches: 2,
      },
      {
        name: "escaped name and value",
        selector: `.future-entry[data-discern-dispositio\\6e =${
          escaped(disposition)
        }]`,
        matches: 1,
      },
      {
        name: "case-insensitive value",
        selector:
          `.future-entry[data-discern-disposition=${disposition.toUpperCase()} i]`,
        matches: 1,
      },
      ...(["~=", "|=", "^=", "$=", "*="] as const).map((operator) => ({
        name: `${operator} operator`,
        selector:
          `.future-entry[data-discern-disposition${operator}${disposition}]`,
        matches: 1,
      })),
    ] as const;
    for (const form of forms) {
      const tokenMutation = `
        ${form.selector} {
          color: var(--discern-color-danger);
        }
      `;
      const treatmentMutation = `
        ${form.selector} {
          background: var(--discern-color-danger-soft);
          border-color: var(--discern-color-warning);
        }
      `;
      assertEquals(
        dispositionTokenFailures(tokenMutation, [disposition], expected),
        [
          `${disposition}: expected --discern-color-ink-muted, found --discern-color-danger`,
        ],
        `${disposition}/${form.name} escaped the state-token parser`,
      );
      const treatmentFailures = neutralDispositionTreatmentFailures(
        treatmentMutation,
        fileDispositions,
        expected,
      );
      assertEquals(
        treatmentFailures.length,
        form.matches * 2,
        `${disposition}/${form.name} escaped the treatment parser: ${
          treatmentFailures.join("; ")
        }`,
      );
      for (
        const token of [
          "--discern-color-danger-soft",
          "--discern-color-warning",
        ]
      ) {
        assert(
          treatmentFailures.some((failure) =>
            failure.startsWith(`${disposition}:`) &&
            failure.includes(token)
          ),
          `${disposition}/${form.name} did not report ${token}`,
        );
      }
    }
  }

  const existenceMutation = `
    .future-entry[data-discern-disposition] {
      background: var(--discern-color-danger-soft);
      border-color: var(--discern-color-warning);
    }
  `;
  assertEquals(
    neutralDispositionTreatmentFailures(
      existenceMutation,
      fileDispositions,
      expected,
    ).length,
    neutralDispositions.length * 2,
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
        name: "guidance.md",
        kind: "file",
        annotation: <OwnershipBadge ownership="authored" />,
      }]}
    />,
  );
  const fileChange = renderToStaticMarkup(
    <ArtifactTree
      nodes={[{
        name: "guidance.md",
        kind: "file",
        annotation: (
          <FileChange
            path="/workspace/guidance.md"
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
