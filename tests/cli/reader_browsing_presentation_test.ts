import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderRadioCli } from "../../src/cli/mod.ts";
import {
  requestSelection,
  type SelectionRequestOptions,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const browsingOptions = {
  label: "Documents",
  choices: [{ id: "design", label: "Design principles", value: "design" }],
  presentation: "browsing",
  completion: "clear-frame",
} satisfies SelectionRequestOptions<string>;

const describedFrameEntries = [
  {
    kind: "group-heading" as const,
    id: "orientation",
    label: "Orientation",
    description: "00-orientation/",
  },
  {
    id: "design",
    label: "Design principles",
    description: "design-principles.md",
  },
] as const;

Deno.test("browsing options remain additive public types", () => {
  assertEquals(browsingOptions.presentation, "browsing");
  assertEquals(browsingOptions.completion, "clear-frame");
});

Deno.test("browsing presentation omits only redundant active chrome", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  const browsing = renderRadioCli({
    kind: "search",
    label: "Documents",
    lifecycle: { status: "active" },
    presentation: "browsing",
    query: "design",
    cursor: 6,
    results: describedFrameEntries,
    highlightedIndex: 1,
    hint: "Enter opens the highlighted document.",
  }, capabilities);
  assertEquals(browsing.split("\n")[0], "Documents");
  assert(!browsing.includes("[active]"));
  assertStringIncludes(browsing, "design▌");
  assertStringIncludes(browsing, "ORIENTATION");
  assertStringIncludes(browsing, "design-principles.md");
  assertStringIncludes(browsing, "Enter opens the highlighted document.");

  const pending = renderRadioCli({
    kind: "search",
    label: "Documents",
    lifecycle: { status: "active" },
    presentation: "browsing",
    query: "",
    cursor: 0,
    results: [],
    pending: true,
  }, capabilities);
  assertStringIncludes(pending, "Documents [searching]");
  assertStringIncludes(pending, "Searching…");

  const invalid = renderRadioCli({
    kind: "search",
    label: "Documents",
    lifecycle: { status: "validation-error", message: "Choose a document." },
    presentation: "browsing",
    query: "",
    cursor: 0,
    results: describedFrameEntries,
    highlightedIndex: 1,
  }, capabilities);
  assertStringIncludes(invalid, "Documents [error]");
  assertStringIncludes(invalid, "Choose a document.");
});

Deno.test("browsing keeps choice lifecycle errors and clears successful completion", async () => {
  const io = new FakeTerminalIO(["\r", "\x1b[B\r"], { columns: 36 });
  assertEquals(
    await requestSelection({
      label: "Documents",
      presentation: "browsing",
      completion: "clear-frame",
      choices: [
        { id: "one", label: "One", description: "one.md", value: 1 },
        { id: "two", label: "Two", description: "two.md", value: 2 },
      ],
      validate: (value) =>
        value === 1 ? "Choose the second document." : undefined,
    }, { io }),
    2,
  );
  assert(!io.output().includes("[active]"));
  assertStringIncludes(io.output(), "Documents [error]");
  assertStringIncludes(io.output(), "Choose the second document.");
  assertStringIncludes(io.output(), "one.md");
  assertStringIncludes(io.output(), "two.md");
  assert(!io.output().includes("[submitted]"));
  assert(
    io.writes.some((write) =>
      write.startsWith("\x1b[1G") && write.endsWith("\x1b[J")
    ),
    "successful browsing cleanup emitted no painter-owned erase",
  );
});
