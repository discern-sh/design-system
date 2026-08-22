import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  type MarkdownBrowserTransition,
  transitionMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-machine.ts";
import {
  createMarkdownBrowserState,
  type MarkdownBrowserEntry,
  type MarkdownBrowserLinkRequest,
  type MarkdownBrowserState,
} from "../../src/cli/interactive/markdown-browser-model.ts";
import {
  markdownBrowserDocumentFragmentOffset,
  markdownBrowserDocumentLines,
  markdownBrowserLinkOccurrences,
  renderMarkdownBrowser,
} from "../../src/cli/interactive/markdown-browser-renderer.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { projectTerminalSpans } from "../../src/cli/projection.ts";

const longLabel =
  "a deliberately long wrapped link label spanning several terminal rows";

const source = `# Start

[${longLabel}](#target)

[Relative guide](../reference/other.md#part), [root guide](/root.md), and [outside](https://example.test/docs).

[Repeated](same.md) then [Repeated](same.md).

[Unsafe](javascript:alert(1)) remains text.

${Array.from({ length: 8 }, (_, index) => `Lead ${index + 1}.`).join("\n\n")}

## Target

Target body.

${Array.from({ length: 12 }, (_, index) => `Tail ${index + 1}.`).join("\n\n")}`;

const entries = [
  {
    kind: "document",
    id: "start",
    label: "Start",
    path: "guides/start.md",
    source,
  },
  {
    kind: "document",
    id: "other",
    label: "Other",
    path: "reference/other.md",
    source: "# Other\n\n## Part\n\nResolved relative document.",
  },
  {
    kind: "document",
    id: "root",
    label: "Root",
    path: "root.md",
    source: "# Root\n\nResolved root document.",
  },
] as const satisfies readonly MarkdownBrowserEntry<never>[];

function createOpened(
  capabilities: TerminalCapabilities,
  rows = 24,
): MarkdownBrowserState<never> {
  const initial = createMarkdownBrowserState<never>({
    label: "Links",
    entries,
    documentMeasure: 18,
  }, { columns: capabilities.columns, rows });
  return transitionMarkdownBrowser(initial, {
    kind: "key",
    key: { kind: "named", name: "enter" },
  }, capabilities).state;
}

function text(
  state: MarkdownBrowserState<never>,
  value: string,
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<never> {
  return transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "text", text: value },
  }, capabilities);
}

function named(
  state: MarkdownBrowserState<never>,
  name: "enter" | "escape" | "end" | "page-down",
  capabilities: TerminalCapabilities,
): MarkdownBrowserTransition<never> {
  return transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name },
  }, capabilities);
}

function activationFor(
  sourceState: MarkdownBrowserState<never>,
  destination: string,
  capabilities: TerminalCapabilities,
): {
  readonly state: MarkdownBrowserState<never>;
  readonly request: MarkdownBrowserLinkRequest;
} {
  let state = sourceState;
  const count = markdownBrowserLinkOccurrences(state, capabilities).length;
  for (let index = 0; index < count; index += 1) {
    state = text(state, "]", capabilities).state;
    const occurrence = markdownBrowserLinkOccurrences(state, capabilities)
      .find((link) => link.id === state.linkFocus?.id);
    if (occurrence?.destination !== destination) continue;
    const request = named(state, "enter", capabilities).linkRequest;
    if (request === undefined) throw new Error("expected a link request");
    return { state, request };
  }
  throw new Error(`no occurrence for ${destination}`);
}

Deno.test("link geometry preserves wrapped and repeated logical occurrences through clipping", () => {
  const capabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "truecolor",
    hyperlinks: true,
  });
  let state = createOpened(capabilities, 18);
  let links = markdownBrowserLinkOccurrences(state, capabilities);
  assertEquals(links.length, 6, "the unsafe destination is not addressable");
  assertEquals(
    links.filter((link) => link.destination === "same.md").length,
    2,
  );
  const repeated = links.filter((link) => link.destination === "same.md");
  assertNotEquals(repeated[0]?.id, repeated[1]?.id);

  const wrapped = links[0];
  if (wrapped === undefined) throw new Error("expected wrapped link");
  assert(wrapped.documentEndRow > wrapped.documentStartRow);
  assert(wrapped.regions.length > 1);
  assert(
    wrapped.regions.every((region) =>
      region.row >= 1 && region.startColumn >= 1 &&
      region.endColumn >= region.startColumn && region.endColumn <= 38
    ),
  );
  assertEquals(links.at(-1)?.visibility, "below");

  state = transitionMarkdownBrowser(state, {
    kind: "mouse",
    action: "wheel",
    direction: "down",
    column: 2,
    row: 2 + state.layout.pickerRows + 1,
    modifiers: { shift: false, alt: false, control: false },
  }, capabilities).state;
  state = transitionMarkdownBrowser(state, {
    kind: "key",
    key: { kind: "named", name: "down" },
  }, capabilities).state;
  const partiallyVisible =
    markdownBrowserLinkOccurrences(state, capabilities)[0];
  if (partiallyVisible === undefined) throw new Error("expected clipped link");
  assertEquals(partiallyVisible.visibility, "visible");
  assert(partiallyVisible.documentStartRow - 1 < state.documentScrollOffset);
  assert(partiallyVisible.documentEndRow - 1 >= state.documentScrollOffset);

  state = named(state, "end", capabilities).state;
  links = markdownBrowserLinkOccurrences(state, capabilities);
  assertEquals(links[0]?.visibility, "above");
  assertEquals(links[0]?.regions, []);

  const plainCapabilities = testTerminalCapabilities({
    columns: 40,
    colorDepth: "none",
    hyperlinks: false,
    unicode: false,
  });
  const plain = createOpened(plainCapabilities, 18);
  assertEquals(
    markdownBrowserLinkOccurrences(plain, plainCapabilities).length,
    links.length,
  );
  const output = markdownBrowserDocumentLines(plain, plainCapabilities).join(
    "\n",
  );
  assert(!output.includes("\x1b"));
  assertStringIncludes(output, "#target");
});

Deno.test("keyboard traversal reveals links, reverses, activates, and returns to scrolling", () => {
  for (
    const profile of [
      { colorDepth: "truecolor" as const, unicode: true },
      { colorDepth: "ansi256" as const, unicode: true },
      { colorDepth: "ansi16" as const, unicode: true },
      { colorDepth: "none" as const, unicode: true },
      { colorDepth: "none" as const, unicode: false },
    ]
  ) {
    const capabilities = testTerminalCapabilities({
      columns: 40,
      hyperlinks: profile.colorDepth !== "none",
      ...profile,
    });
    let state = createOpened(capabilities, 18);
    state = text(state, "]", capabilities).state;
    const firstId = state.linkFocus?.id;
    assert(firstId !== undefined);
    assertEquals(state.linkFocus?.origin, "keyboard");
    const frame = renderMarkdownBrowser(state, capabilities);
    const plain = stripAnsi(frame);
    assertStringIncludes(
      plain,
      profile.unicode ? "›a deliberately" : ">a deliberately",
    );
    assertStringIncludes(plain, "Enter follow");
    for (const line of frame.split("\n")) projectTerminalSpans(line);

    state = text(state, "]", capabilities).state;
    const secondId = state.linkFocus?.id;
    assert(secondId !== undefined);
    assertNotEquals(secondId, firstId);
    state = text(state, "[", capabilities).state;
    assertEquals(state.linkFocus?.id, firstId);

    const activation = named(state, "enter", capabilities);
    assertEquals(activation.linkRequest?.destination, "#target");
    assert(Object.isFrozen(activation.linkRequest));
    assert(Object.isFrozen(activation.linkRequest?.availableDocuments));

    state = named(state, "escape", capabilities).state;
    assertEquals(state.linkFocus, undefined);
    assertEquals(state.openedDocumentId, "start");
    assertStringIncludes(
      stripAnsi(renderMarkdownBrowser(state, capabilities)),
      "Esc/q close",
    );
  }
});

Deno.test("typed resolver outcomes navigate fragments and documents or return resumable external actions", () => {
  const capabilities = testTerminalCapabilities({
    columns: 80,
    colorDepth: "truecolor",
    hyperlinks: true,
  });
  const initial = createOpened(capabilities);

  const same = activationFor(initial, "#target", capabilities);
  const fragmentOffset = markdownBrowserDocumentFragmentOffset(
    same.state,
    capabilities,
    "#target",
  );
  assert(fragmentOffset !== undefined && fragmentOffset > 0);
  const atFragment = transitionMarkdownBrowser(same.state, {
    kind: "link-resolution",
    request: same.request,
    resolution: { kind: "fragment", fragment: "#target" },
  }, capabilities).state;
  assertEquals(atFragment.openedDocumentId, "start");
  assert(atFragment.documentScrollOffset > 0);
  assertEquals(atFragment.linkFocus, undefined);

  const relative = activationFor(
    initial,
    "../reference/other.md#part",
    capabilities,
  );
  const inOther = transitionMarkdownBrowser(relative.state, {
    kind: "link-resolution",
    request: relative.request,
    resolution: { kind: "document", documentId: "other", fragment: "part" },
  }, capabilities).state;
  assertEquals(inOther.openedDocumentId, "other");
  assertEquals(inOther.focusedPane, "document");

  const root = activationFor(initial, "/root.md", capabilities);
  const inRoot = transitionMarkdownBrowser(root.state, {
    kind: "link-resolution",
    request: root.request,
    resolution: { kind: "document", documentId: "root" },
  }, capabilities).state;
  assertEquals(inRoot.openedDocumentId, "root");

  const outside = activationFor(
    initial,
    "https://example.test/docs",
    capabilities,
  );
  const external = transitionMarkdownBrowser(outside.state, {
    kind: "link-resolution",
    request: outside.request,
    resolution: {
      kind: "external",
      destination: "https://example.test/docs",
    },
  }, capabilities).result;
  if (external?.kind !== "external-link") {
    throw new Error("expected external-link result");
  }
  assertEquals(external.destination, "https://example.test/docs");
  assertEquals(external.state.linkFocus?.id, outside.state.linkFocus?.id);

  const unresolved = transitionMarkdownBrowser(relative.state, {
    kind: "link-resolution",
    request: relative.request,
    resolution: { kind: "unresolved", message: "No admitted document." },
  }, capabilities).state;
  assertEquals(unresolved.openedDocumentId, "start");
  assertEquals(unresolved.feedback, {
    kind: "unresolved-link",
    message: "No admitted document.",
  });
  const bounded = transitionMarkdownBrowser(relative.state, {
    kind: "link-resolution",
    request: relative.request,
    resolution: { kind: "unresolved", message: "x".repeat(200) },
  }, capabilities).state.feedback;
  assertEquals(bounded?.kind, "unresolved-link");
  assertEquals(bounded?.message.length, 120);

  assertThrows(
    () =>
      transitionMarkdownBrowser(outside.state, {
        kind: "link-resolution",
        request: outside.request,
        resolution: {
          kind: "external",
          destination: "javascript:alert(1)",
        },
      }, capabilities),
    TypeError,
    "unsafe scheme",
  );
});
