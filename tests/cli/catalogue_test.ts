import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { detectTerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { CliComponentRegistryEntry } from "../../src/cli/contracts.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { componentRegistry } from "../../src/generated/component-registry.ts";
import { componentGroups } from "../../src/types/component-meta.ts";
import { terminalFoundationSheets } from "../../catalogue/terminal-foundations.ts";
import {
  renderCliCatalogue,
  resolveCatalogueSelection,
  resolveCliCatalogueCommand,
} from "../../scripts/catalogue-cli.ts";
import {
  catalogueBrowserItems,
  renderCliCatalogueIndex,
  runCliCatalogueBrowser,
} from "../../scripts/catalogue-browser.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const registry = cliComponentRegistry as Readonly<
  Record<string, CliComponentRegistryEntry>
>;

Deno.test("CLI catalogue separates browsing, indexing, and exhaustive output", () => {
  assertEquals(resolveCliCatalogueCommand([], true), { kind: "browse" });
  assertEquals(resolveCliCatalogueCommand([], false), { kind: "list" });
  assertEquals(resolveCliCatalogueCommand(["--list"], true), {
    kind: "list",
  });
  assertEquals(resolveCliCatalogueCommand(["all"], true), {
    kind: "render",
    selector: "all",
  });
  assertEquals(resolveCliCatalogueCommand(["badge"], true), {
    kind: "render",
    selector: "badge",
  });
});

Deno.test("compact catalogue index and browser auto-enrol every generated member", () => {
  const index = renderCliCatalogueIndex();
  const items = catalogueBrowserItems();
  for (const sheet of terminalFoundationSheets) {
    assertStringIncludes(index, sheet.id);
    assert(
      items.some((item) => item.kind === "foundation" && item.id === sheet.id),
      `browser omits terminal foundation ${sheet.id}`,
    );
  }
  for (const { meta } of componentRegistry) {
    assertStringIncludes(index, meta.slug);
    assert(
      items.some(
        (item) => item.kind === "component" && item.fact.slug === meta.slug,
      ),
      `browser omits generated Component ${meta.slug}`,
    );
  }
  assert(
    index.split("\n").length < 80,
    "compact index regressed into another exhaustive catalogue",
  );
});

Deno.test("interactive catalogue searches and reviews one specimen in an alternate screen", async () => {
  const io = new FakeTerminalIO(["/badge\r", "q"], {
    columns: 80,
    rows: 24,
    ansiControl: true,
  });
  await runCliCatalogueBrowser(io);
  assertStringIncludes(io.output(), "Display / Badge (`badge`)");
  assertStringIncludes(io.output(), "accent");
  assertStringIncludes(io.output(), "\x1b[?1049h");
  assertStringIncludes(io.output(), "\x1b[?1049l");
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("CLI catalogue resolves all, Group, Component, and motif selectors", () => {
  assertEquals(resolveCatalogueSelection(undefined), { kind: "all" });
  assertEquals(resolveCatalogueSelection("all"), { kind: "all" });
  assertEquals(resolveCatalogueSelection("feedback"), {
    kind: "group",
    group: "Feedback",
  });
  assertEquals(resolveCatalogueSelection("badge"), {
    kind: "component",
    slug: "badge",
  });
  assertEquals(resolveCatalogueSelection("motifs"), {
    kind: "foundation",
    id: "motifs",
  });
  assertEquals(resolveCatalogueSelection("narration"), {
    kind: "foundation",
    id: "narration",
  });
  assertThrows(
    () => resolveCatalogueSelection("unknown-surface"),
    TypeError,
    "Unknown CLI catalogue selector",
  );
});

Deno.test("complete CLI catalogue renders every registry entry and exemption", async () => {
  const output = await renderCliCatalogue(
    undefined,
    testTerminalCapabilities({ columns: 80 }),
  );
  for (const sheet of terminalFoundationSheets) {
    assertStringIncludes(output, `## ${sheet.title}`);
  }
  for (const group of componentGroups) {
    assertStringIncludes(output, `## ${group}`);
  }
  for (const { meta } of componentRegistry) {
    assertStringIncludes(output, `### ${meta.name} (\`${meta.slug}\`)`);
    const entry = registry[meta.slug];
    if (entry?.stance === "exempt") {
      assertStringIncludes(output, entry.reason);
    }
  }
  const exemptions = Object.values(cliComponentRegistry).filter((entry) =>
    entry.stance === "exempt"
  );
  assertEquals(output.match(/— exempt$/gm)?.length ?? 0, exemptions.length);
});

Deno.test("CLI catalogue filters one Group or Component without hiding exemptions", async () => {
  const capabilities = testTerminalCapabilities({ columns: 80 });
  const feedback = await renderCliCatalogue("Feedback", capabilities);
  assertStringIncludes(feedback, "## Feedback");
  assert(!feedback.includes("## Forms"));
  for (
    const { meta } of componentRegistry.filter(({ meta }) =>
      meta.group === "Feedback"
    )
  ) {
    assertStringIncludes(feedback, `### ${meta.name} (\`${meta.slug}\`)`);
  }

  const badge = await renderCliCatalogue("badge", capabilities);
  assertStringIncludes(badge, "## Display");
  assertStringIncludes(badge, "### Badge (`badge`)");
  assert(!badge.includes("### Card (`card`)"));

  const tooltip = await renderCliCatalogue("tooltip", capabilities);
  assertStringIncludes(tooltip, "### Tooltip (`tooltip`) — exempt");
  assertStringIncludes(
    tooltip,
    cliComponentRegistry.tooltip.reason,
  );
});

Deno.test("CLI catalogue honours a Component example's capability posture", async () => {
  const output = await renderCliCatalogue(
    "markdown",
    testTerminalCapabilities({
      columns: 80,
      colorDepth: "truecolor",
      unicode: true,
      hyperlinks: true,
    }),
  );
  const heading = "#### narrow-ascii-no-colour";
  const start = output.indexOf(heading);
  assert(start >= 0);
  const narrow = output.slice(start);
  assert(!narrow.includes("\u001b"));
  assertStringIncludes(narrow, "* Preserve");
  assert(!narrow.includes("•"));
});

Deno.test("motif catalogue derives the complete default and custom specimen set", async () => {
  const output = await renderCliCatalogue(
    "motifs",
    testTerminalCapabilities({ columns: 32 }),
  );
  for (
    const heading of [
      "Horizontal divider",
      "Left-aligned divider",
      "Vertical divider",
      "Thick ribbon",
      "Spinner phases",
      "Determinate progress",
      "Labeled section rule",
      "Stepper states",
      "Activity-beacon phases",
      "Derived consumer override",
    ]
  ) {
    assertStringIncludes(output, `### ${heading}`);
  }
  assertEquals(output.includes("### Field / weave"), false);
  assertStringIncludes(output, "65 percent\n[ 65%]");
  for (
    const status of ["pending", "active", "complete", "error", "cancelled"]
  ) {
    assertStringIncludes(output, status);
  }
  assertStringIncludes(output, "◴ ◷ ◶ ◵");
  assertStringIncludes(output, "▵ CONSUMER OVERRIDE");
});

Deno.test("narration catalogue presents every verb and the composed rhythm", async () => {
  const output = await renderCliCatalogue(
    "narration",
    testTerminalCapabilities({ columns: 80 }),
  );
  for (
    const heading of [
      "Success",
      "Note",
      "Warning",
      "Failure",
      "Lead-in",
      "Composed rhythm",
    ]
  ) {
    assertStringIncludes(output, `### ${heading}`);
  }
  assertStringIncludes(output, "✓ Checks passed");
  assertStringIncludes(output, "▸ Cache already warm");
  assertStringIncludes(output, "! Two files skipped");
  assertStringIncludes(output, "✕ One frame diverged");
  assertStringIncludes(output, "▲ RELEASE CHECKS");
  assertStringIncludes(
    output,
    "▲ RELEASE CHECKS\n\n✓ Checks passed\n▸ Cache already warm\n\n! Two files skipped",
  );
  assert(!output.includes("## Terminal motifs"));
  assert(!output.includes("## Display"));

  const ascii = await renderCliCatalogue(
    "narration",
    testTerminalCapabilities({ columns: 80, unicode: false }),
  );
  assertStringIncludes(ascii, "+ Checks passed");
  assertStringIncludes(ascii, "^ RELEASE CHECKS");
});

Deno.test("NO_COLOR suppresses ANSI throughout catalogue output", async () => {
  const capabilities = detectTerminalCapabilities({
    env: {
      NO_COLOR: "1",
      TERM: "xterm-256color",
      LANG: "en-GB.UTF-8",
    },
    isTty: true,
    columns: 80,
  });
  assertEquals(capabilities.colorDepth, "none");
  const output = await renderCliCatalogue("badge", capabilities);
  assert(!output.includes(String.fromCharCode(27)));
});

Deno.test("consumer-hardening examples enrol through Component CLI registries", async () => {
  const capabilities = testTerminalCapabilities({ columns: 80 });
  const select = await renderCliCatalogue("select", capabilities);
  assertStringIncludes(select, "#### grouped");
  assertStringIncludes(select, "RECOMMENDED");

  const fleet = await renderCliCatalogue("fleet", capabilities);
  assertStringIncludes(fleet, "#### lossless-identities");
  assertStringIncludes(
    fleet,
    "agent/terminal-contract-audit-with-complete-identities",
  );
});
