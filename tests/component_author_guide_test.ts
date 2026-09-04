import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  COMPONENT_AUTHOR_GUIDE_TITLE,
  componentAuthorGuideHeading,
  type ComponentAuthorGuideSource,
  renderComponentAuthorGuide,
} from "../scripts/component-author-guide.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import {
  componentAuthorGuide,
  componentMetadata,
} from "../src/component-metadata.ts";
import {
  type ComponentExampleDefinition,
  resolveComponentExampleVocabulary,
} from "../src/types/component-examples.ts";
import {
  cataloguePurposeDetails,
  cataloguePurposes,
  componentGroups,
  type ComponentMeta,
} from "../src/types/component-meta.ts";

function source(
  meta: ComponentMeta,
  vocabulary: readonly ComponentExampleDefinition[] = [
    { id: "default", label: `${meta.name} at rest` },
  ],
): ComponentAuthorGuideSource {
  return {
    meta,
    examples: resolveComponentExampleVocabulary(meta, vocabulary),
  };
}

const complete: ComponentMeta = {
  name: "Probe panel",
  slug: "probe-panel",
  group: "Feedback",
  order: 999,
  cli: { stance: "rendered" },
  description: "A synthetic future Component proving guide enrolment.",
  purposes: ["displaying-tool-output", "procedural-workflow"],
  useWhen: ["A probe result must stay visible beside its cause."],
  notWhen: ["The result is a single number; Stat serves it."],
  accessibility: ["The panel names its status as text before any glyph."],
  behaviors: ["floating-surface"],
};

const minimal: ComponentMeta = {
  name: "Bare mark",
  slug: "bare-mark",
  group: "Core",
  order: 999,
  cli: { stance: "rendered" },
  description: "A synthetic primitive with no optional Metadata at all.",
};

const exempt: ComponentMeta = {
  name: "Probe field",
  slug: "probe-field",
  group: "Artwork",
  order: 999,
  cli: {
    stance: "exempt",
    reason:
      "Probe field paints a continuous decorative browser plane that terminal cells cannot represent.",
  },
  description: "A synthetic decorative field with no terminal equivalent.",
  purposes: ["marketing-site"],
};

Deno.test("a future Component enrols in the guide with every Metadata fact", () => {
  const guide = renderComponentAuthorGuide([source(complete)]);
  assert(guide.startsWith(`${COMPONENT_AUTHOR_GUIDE_TITLE}\n`));
  assertStringIncludes(
    guide,
    "\n## Feedback\n\n### Probe panel (`probe-panel`)\n",
  );
  assertStringIncludes(guide, complete.description);
  assertStringIncludes(
    guide,
    "Group: Feedback. Purposes: displaying-tool-output, procedural-workflow.",
  );
  assertStringIncludes(
    guide,
    "React: `ProbePanel`. Terminal: `renderProbePanelCli`.",
  );
  assertStringIncludes(guide, "Browser behavior: `floating-surface`");
  assertStringIncludes(
    guide,
    "Use when:\n- A probe result must stay visible beside its cause.\n",
  );
  assertStringIncludes(
    guide,
    "Do not use when:\n- The result is a single number; Stat serves it.\n",
  );
  assertStringIncludes(
    guide,
    "Accessibility:\n- The panel names its status as text before any glyph.\n",
  );
  assertStringIncludes(guide, "Examples: Probe panel at rest (`default`).");
  for (const purpose of complete.purposes ?? []) {
    const line = guide.split("\n").find((candidate) =>
      candidate.includes(`(\`${purpose}\`)`)
    );
    assert(line, `${purpose} has no index line`);
    assertStringIncludes(line, cataloguePurposeDetails[purpose].label);
    assertStringIncludes(line, "Probe panel (`probe-panel`)");
  }
  assert(guide.endsWith(".\n"), "the guide ends with one newline");
});

Deno.test("absent optional Metadata renders an explicit absence line, never silence", () => {
  const guide = renderComponentAuthorGuide([source(minimal)]);
  assertStringIncludes(guide, "Group: Core. Purposes: none.");
  assertStringIncludes(
    guide,
    "Use when: Metadata states no situation narrower than the description.",
  );
  assertStringIncludes(
    guide,
    "Do not use when: Metadata records no refusal; weigh the sibling Components in this Group.",
  );
  assertStringIncludes(
    guide,
    "Accessibility: Metadata records no Component-specific note; the package invariants still apply.",
  );
  assert(!guide.includes("Browser behavior:"));
  for (const purpose of cataloguePurposes) {
    assertStringIncludes(guide, `(\`${purpose}\`): `);
    const line = guide.split("\n").find((candidate) =>
      candidate.includes(`(\`${purpose}\`)`)
    );
    assert(line?.endsWith("Components: none."), `${purpose} should be empty`);
  }
});

Deno.test("an exempt terminal stance carries its reason and web-only examples", () => {
  const guide = renderComponentAuthorGuide([
    source(exempt, [{ id: "default", label: "Probe field", only: "web" }]),
  ]);
  assertStringIncludes(
    guide,
    `React: \`ProbeField\`. Terminal: exempt — ${
      exempt.cli.stance === "exempt" ? exempt.cli.reason : ""
    }`,
  );
  assertStringIncludes(guide, "Examples: Probe field (`default`, web only).");
});

Deno.test("Groups follow canonical order and keep their given member order", () => {
  const later: ComponentMeta = {
    ...minimal,
    name: "Later mark",
    slug: "later-mark",
  };
  const guide = renderComponentAuthorGuide([
    source(complete),
    source(later),
    source(exempt, [{ id: "default", label: "Probe field", only: "web" }]),
    source(minimal),
  ]);
  const headings = guide.split("\n").filter((line) => line.startsWith("## "));
  assertEquals(headings, [
    "## Purposes",
    "## Core",
    "## Artwork",
    "## Feedback",
  ]);
  assertEquals(
    componentGroups.filter((group) => headings.includes(`## ${group}`)),
    ["Core", "Artwork", "Feedback"],
  );
  assert(
    guide.indexOf("### Later mark") < guide.indexOf("### Bare mark"),
    "members keep the order the inventory supplied",
  );
});

Deno.test("the renderer refuses an empty or duplicated inventory", () => {
  assertThrows(() => renderComponentAuthorGuide([]), Error, "at least one");
  assertThrows(
    () => renderComponentAuthorGuide([source(minimal), source(minimal)]),
    Error,
    "Duplicate Component slug",
  );
});

Deno.test("the committed guide covers every registered Component exactly once", () => {
  assert(componentAuthorGuide.startsWith(`${COMPONENT_AUTHOR_GUIDE_TITLE}\n`));
  assertEquals(componentMetadata.length, componentRegistry.length);
  assert(Object.isFrozen(componentMetadata));
  for (const [index, entry] of componentRegistry.entries()) {
    assertEquals(componentMetadata[index], entry.meta, entry.meta.slug);
    const heading = `\n${componentAuthorGuideHeading(entry.meta)}\n`;
    assertEquals(
      componentAuthorGuide.split(heading).length - 1,
      1,
      `${entry.meta.slug} must have exactly one guide section`,
    );
  }
  assertEquals(
    componentAuthorGuide.split("\n").filter((line) => line.startsWith("### "))
      .length,
    componentRegistry.length,
  );
});

Deno.test("purpose collections index every enrolled Component under the shared label", () => {
  const lines = componentAuthorGuide.split("\n");
  for (const purpose of cataloguePurposes) {
    const line = lines.find((candidate) =>
      candidate.includes(`(\`${purpose}\`)`)
    );
    assert(line, `${purpose} has no index line`);
    assertStringIncludes(line, `**${cataloguePurposeDetails[purpose].label}**`);
    assertStringIncludes(line, cataloguePurposeDetails[purpose].description);
    for (const meta of componentMetadata) {
      const listed = line.includes(`${meta.name} (\`${meta.slug}\`)`);
      assertEquals(
        listed,
        meta.purposes?.includes(purpose) ?? false,
        `${meta.slug} listing under ${purpose}`,
      );
    }
  }
});
