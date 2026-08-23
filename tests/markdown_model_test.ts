import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import {
  MARKDOWN_BLOCK_KINDS,
  MARKDOWN_MAX_SOURCE_BYTES,
  MARKDOWN_PARSER_NODE_HANDLING,
  type MarkdownBlock,
  MarkdownParseError,
  parseMarkdown,
} from "../src/components/editorial/markdown/markdown.model.ts";
import { MARKDOWN_REACT_HANDLED_BLOCK_KINDS } from "../src/components/editorial/markdown/markdown.tsx";
import { MARKDOWN_CLI_HANDLED_BLOCK_KINDS } from "../src/components/editorial/markdown/markdown.cli.ts";
import {
  MARKDOWN_SUPPORTED_FEATURES,
  markdownFixtures,
} from "../src/fixtures/markdown.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));

function allBlockKinds(blocks: readonly MarkdownBlock[]): Set<string> {
  const kinds = new Set<string>();
  const visit = (block: MarkdownBlock): void => {
    kinds.add(block.kind);
    switch (block.kind) {
      case "list":
        block.items.forEach((item) => item.blocks.forEach(visit));
        break;
      case "blockquote":
      case "callout":
        block.children.forEach(visit);
        break;
      case "footnotes":
        block.items.forEach((item) => item.children.forEach(visit));
        break;
      case "paragraph":
      case "heading":
      case "code":
      case "thematic-break":
      case "table":
      case "diagram":
        break;
    }
  };
  blocks.forEach(visit);
  return kinds;
}

Deno.test("Markdown fixture inventory covers every fixed dialect feature", () => {
  const ids = markdownFixtures.map((fixture) => fixture.id);
  assertEquals(new Set(ids).size, ids.length, "fixture ids must be unique");
  const enrolled = new Set(
    markdownFixtures.flatMap((fixture) => fixture.features),
  );
  assertEquals(
    [...enrolled].toSorted(),
    [...MARKDOWN_SUPPORTED_FEATURES].toSorted(),
  );
  for (const fixture of markdownFixtures) {
    assert(fixture.provenance.trim() !== "", `${fixture.id} lacks provenance`);
    const document = parseMarkdown(fixture.source);
    const kinds = allBlockKinds(document.children);
    for (const expected of fixture.blockKinds) {
      assert(kinds.has(expected), `${fixture.id} did not produce ${expected}`);
    }
  }
});

Deno.test("parser and both projections declare the same closed node sets", () => {
  const neutral = [...MARKDOWN_BLOCK_KINDS].toSorted();
  assertEquals(
    Object.keys(MARKDOWN_REACT_HANDLED_BLOCK_KINDS).toSorted(),
    neutral,
  );
  assertEquals(
    Object.keys(MARKDOWN_CLI_HANDLED_BLOCK_KINDS).toSorted(),
    neutral,
  );
  assertEquals(
    Object.keys(MARKDOWN_PARSER_NODE_HANDLING).toSorted(),
    [
      "blockquote",
      "break",
      "code",
      "definition",
      "delete",
      "emphasis",
      "footnoteDefinition",
      "footnoteReference",
      "heading",
      "html",
      "image",
      "imageReference",
      "inlineCode",
      "link",
      "linkReference",
      "list",
      "listItem",
      "paragraph",
      "root",
      "strong",
      "table",
      "tableCell",
      "tableRow",
      "text",
      "thematicBreak",
      "yaml",
    ].toSorted(),
  );
});

Deno.test("neutral documents contain no parser AST fields", () => {
  for (const fixture of markdownFixtures) {
    const document = parseMarkdown(fixture.source);
    const visit = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }
      if (typeof value !== "object" || value === null) return;
      const record = value as Record<string, unknown>;
      for (const forbidden of ["type", "position", "data"]) {
        assert(
          !(forbidden in record),
          `${fixture.id} leaked ${path}.${forbidden}`,
        );
      }
      for (const [key, item] of Object.entries(record)) {
        visit(item, `${path}.${key}`);
      }
    };
    visit(document, "$document");
  }
});

Deno.test("headings use GitHub-compatible ids and deterministic duplicate suffixes", () => {
  const document = parseMarkdown([
    "# Your files / Yours",
    "## Bookkeeping & integration",
    "## public_doc_leaf_density",
    "## Repeat",
    "## Repeat",
    "# !!!",
    "# I İ",
  ].join("\n"));
  assertEquals(
    document.children.filter((block) => block.kind === "heading").map((block) =>
      block.id
    ),
    [
      "your-files--yours",
      "bookkeeping--integration",
      "public_doc_leaf_density",
      "repeat",
      "repeat-1",
      "section",
      "i-i",
    ],
  );
});

Deno.test("all five official alert markers map to their documented Callout tones", () => {
  const source = [
    "> [!NOTE]\n> note",
    "> [!TIP]\n> tip",
    "> [!IMPORTANT]\n> important",
    "> [!WARNING]\n> warning",
    "> [!CAUTION]\n> caution",
  ].join("\n\n");
  const callouts = parseMarkdown(source).children.filter((block) =>
    block.kind === "callout"
  );
  assertEquals(callouts.map(({ title, tone }) => [title, tone]), [
    ["Note", "note"],
    ["Tip", "success"],
    ["Important", "insight"],
    ["Warning", "warning"],
    ["Caution", "warning"],
  ]);
  assertEquals(parseMarkdown("> [!NOTE]").children, [{
    kind: "callout",
    title: "Note",
    tone: "note",
    children: [],
  }]);
  assertEquals(
    parseMarkdown("> [!note]\n> ordinary").children[0]?.kind,
    "blockquote",
  );
  assertEquals(
    parseMarkdown("> [!NOTE] same line").children[0]?.kind,
    "blockquote",
  );
});

Deno.test("references, URL policy, controls, HTML, and footnotes resolve before projection", () => {
  const source = [
    "[Safe](https://例.test/π) [Relative](../guide#part) [Upper](FILE:///tmp/report)",
    "[Unsafe](javascript:alert(1)) ![Unsafe](data:text/html,boom)",
    "Control ‮ and note[^proof] again[^proof].",
    "",
    "<b>literal</b><!-- omit me -->",
    "",
    "<!-- adjacent secret --><i>adjacent literal</i>",
    "",
    "[^proof]: Evidence.",
  ].join("\n");
  const document = parseMarkdown(source);
  const serialized = JSON.stringify(document);
  assertStringIncludes(serialized, "https://%E4%BE%8B.test/%CF%80");
  assertStringIncludes(serialized, "../guide#part");
  assertStringIncludes(serialized, "FILE:///tmp/report");
  assert(!serialized.includes('"destination":"javascript:'));
  assert(!serialized.includes('"source":"data:'));
  assertStringIncludes(serialized, "javascript:alert(1)");
  assertStringIncludes(serialized, "data:text/html,boom");
  assertStringIncludes(serialized, "\\\\u{1B}\\\\u{202E}");
  assertStringIncludes(serialized, '"text":"<b>"');
  assertStringIncludes(serialized, '"text":"</b>"');
  assertStringIncludes(serialized, '"literal"');
  assertStringIncludes(serialized, "<i>adjacent literal</i>");
  assert(!serialized.includes("omit me"));
  assert(!serialized.includes("adjacent secret"));
  const footnotes = document.children.at(-1);
  assert(footnotes?.kind === "footnotes");
  assertEquals(footnotes.items[0]?.returnIds, ["fnref-1", "fnref-1-2"]);
});

Deno.test("LF and CRLF produce the same neutral document", () => {
  const lf = "# Heading\n\nParagraph\n\n- one\n- two\n";
  assertEquals(parseMarkdown(lf.replaceAll("\n", "\r\n")), parseMarkdown(lf));
});

Deno.test("empty and malformed-but-valid source has deterministic fallback behavior", () => {
  assertEquals(parseMarkdown(" \n\t\n"), { kind: "document", children: [] });
  const malformed = JSON.stringify(
    parseMarkdown("Text with *unclosed and [link]("),
  );
  assertStringIncludes(malformed, "*unclosed");
  assertStringIncludes(malformed, "[link](");
});

Deno.test("source bytes, parser nodes, and structural depth fail as whole documents", () => {
  const oversized = "é".repeat(Math.floor(MARKDOWN_MAX_SOURCE_BYTES / 2) + 1);
  assertThrows(
    () => parseMarkdown(oversized),
    MarkdownParseError,
    `${MARKDOWN_MAX_SOURCE_BYTES}-byte limit`,
  );
  assertThrows(
    () => parseMarkdown("> ".repeat(63) + "deep"),
    MarkdownParseError,
    "64-level depth limit",
  );
  assertThrows(
    () => parseMarkdown("[a](#x) ".repeat(34_000)),
    MarkdownParseError,
    "100000-node limit",
  );
});

interface PackageJson {
  readonly name: string;
  readonly version: string;
  readonly license?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

async function parserDependencyPackages(): Promise<
  readonly {
    readonly directory: string;
    readonly manifest: PackageJson;
  }[]
> {
  const queue = [
    "mdast-util-from-markdown",
    "mdast-util-gfm",
    "micromark-extension-gfm",
    "@types/mdast",
  ].map((name) => join(PACKAGE_ROOT, "node_modules", name));
  const seen = new Set<string>();
  const packages: { directory: string; manifest: PackageJson }[] = [];
  while (queue.length > 0) {
    const candidate = queue.pop();
    if (candidate === undefined) break;
    const directory = await Deno.realPath(candidate);
    if (seen.has(directory)) continue;
    seen.add(directory);
    const manifest = JSON.parse(
      await Deno.readTextFile(join(directory, "package.json")),
    ) as PackageJson;
    packages.push({ directory, manifest });
    const resolutionRoot = manifest.name.startsWith("@")
      ? dirname(dirname(directory))
      : dirname(directory);
    const dependencies = Object.keys({
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    });
    for (const dependency of dependencies) {
      const path = join(resolutionRoot, dependency);
      try {
        await Deno.lstat(path);
        queue.push(path);
      } catch (cause) {
        if (!(cause instanceof Deno.errors.NotFound)) throw cause;
      }
    }
  }
  return packages;
}

Deno.test("the complete pinned Markdown parser graph remains MIT licensed", async () => {
  const packages = await parserDependencyPackages();
  assertEquals(packages.length, 58, "review every parser graph change");
  for (const { directory, manifest } of packages) {
    assertEquals(
      manifest.license,
      "MIT",
      `${manifest.name}@${manifest.version} changed licence`,
    );
    const names: string[] = [];
    for await (const entry of Deno.readDir(directory)) names.push(entry.name);
    const licence = names.find((name) => /^licen[cs]e(?:\.|$)/iu.test(name));
    assert(licence !== undefined, `${manifest.name} has no licence text`);
    const text = await Deno.readTextFile(join(directory, licence));
    assertStringIncludes(text, "Permission is hereby granted");
  }
});
