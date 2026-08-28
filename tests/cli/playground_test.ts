import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import * as interactiveAdapter from "../../src/cli/interactive/mod.ts";
import {
  HIDE_TERMINAL_CURSOR,
  NonInteractiveTerminalError,
  SHOW_TERMINAL_CURSOR,
  type SpinnerScheduler,
} from "../../src/cli/interactive/mod.ts";
import { createMarkdownBrowserState } from "../../src/cli/interactive/markdown-browser-model.ts";
import { renderMarkdownBrowser } from "../../src/cli/interactive/markdown-browser-renderer.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { componentGroups } from "../../src/types/component-meta.ts";
import { terminalFoundationSheets } from "../../catalogue/terminal-foundations.ts";
import {
  listCliComponents,
  renderCliExemptions,
} from "../../scripts/cli-inventory.ts";
import {
  browseComponentChoices,
  browseTopChoices,
} from "../../scripts/playground/browse.ts";
import {
  interactiveExportCoverage,
  journeyById,
  playgroundJourneys,
  runJourney,
} from "../../scripts/playground/journeys.ts";
import { runHub, runTour } from "../../scripts/playground/hub.ts";
import {
  journeySections,
  type PlaygroundJourney,
  type PlaygroundRuntime,
} from "../../scripts/playground/types.ts";
import {
  documentChoices,
  markdownBrowserEntries,
} from "../../scripts/playground/fixtures.ts";
import { createPlaygroundNavigator } from "../../scripts/playground/navigation.ts";
import {
  createPlaygroundRuntime,
  renderJourneyList,
  resolvePlaygroundSelection,
  runPlayground,
} from "../../scripts/playground-cli.ts";
import { FakeTerminalIO } from "../../src/cli/interactive/testing.ts";

const ENTER = "\r";
const DOWN = "\x1b[B";
const UP = "\x1b[A";
const END = "\x1b[F";
const CTRL_A = "\x01";
const CTRL_C = "\x03";
const CTRL_D = "\x04";
const CTRL_U = "\x15";

function directNavigationCalls(source: string): number {
  return source.match(/\brequest(?:Search|Selection)\s*\(/gu)?.length ?? 0;
}

function journey(id: string): PlaygroundJourney {
  const found = journeyById(id);
  if (found === undefined) throw new Error(`missing playground journey ${id}`);
  return found;
}

function instantScheduler(): SpinnerScheduler {
  return {
    repeat(callback) {
      callback();
      callback();
      callback();
      return () => {};
    },
  };
}

function testRuntime(
  io: FakeTerminalIO,
  overrides: Partial<Omit<PlaygroundRuntime, "io">> = {},
): PlaygroundRuntime {
  return createPlaygroundRuntime(io, {
    delay: () => Promise.resolve(),
    spinnerScheduler: instantScheduler(),
    degradedIo: () => {
      throw new Error("degraded terminal was not injected for this test");
    },
    ...overrides,
  });
}

Deno.test("playground selectors resolve every mode and reject unknowns", () => {
  assertEquals(resolvePlaygroundSelection([]), { kind: "hub" });
  assertEquals(resolvePlaygroundSelection([""]), { kind: "hub" });
  assertEquals(resolvePlaygroundSelection(["--list"]), { kind: "list" });
  assertEquals(resolvePlaygroundSelection(["list"]), { kind: "list" });
  assertEquals(resolvePlaygroundSelection(["--help"]), { kind: "list" });
  assertEquals(resolvePlaygroundSelection(["tour"]), { kind: "tour" });
  assertEquals(resolvePlaygroundSelection(["stress-reopen-loop"]), {
    kind: "journey",
    id: "stress-reopen-loop",
  });
  const unknown = assertThrows(
    () => resolvePlaygroundSelection(["unknown-journey"]),
    TypeError,
    "Unknown playground selector",
  );
  for (const { id } of playgroundJourneys) {
    assertStringIncludes(unknown.message, id);
  }
  assertThrows(
    () => resolvePlaygroundSelection(["text", "masked"]),
    TypeError,
    "one selector",
  );
});

Deno.test("journey inventory stays unique, sectioned, and fully listed", () => {
  const ids = playgroundJourneys.map(({ id }) => id);
  assertEquals(new Set(ids).size, ids.length, "journey IDs must be unique");
  for (const entry of playgroundJourneys) {
    assert(
      (journeySections as readonly string[]).includes(entry.section),
      `journey ${entry.id} names unknown section ${entry.section}`,
    );
  }
  for (const section of journeySections) {
    assert(
      playgroundJourneys.some((entry) => entry.section === section),
      `section ${section} lists no journeys`,
    );
  }
  const list = renderJourneyList();
  assertStringIncludes(list, "tour");
  for (const { id, description } of playgroundJourneys) {
    assertStringIncludes(list, id);
    assertStringIncludes(list, description);
  }
});

Deno.test("persistent playground navigation stays behind the screen manager", async () => {
  assertEquals(
    directNavigationCalls(
      'await requestSelection({ label: "Unrelated sibling", choices });',
    ),
    1,
    "the guard must reject a freshly named future navigation loop",
  );
  for await (const entry of Deno.readDir("scripts/playground")) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    if (entry.name === "journeys.ts" || entry.name === "navigation.ts") {
      continue;
    }
    const path = `scripts/playground/${entry.name}`;
    const source = await Deno.readTextFile(path);
    assertEquals(
      directNavigationCalls(source),
      0,
      `${path} bypasses the shared screen-managed navigation boundary`,
    );
  }
  const navigation = await Deno.readTextFile(
    "scripts/playground/navigation.ts",
  );
  assertStringIncludes(navigation, 'presentation: "menu" as const');
  assertEquals(navigation.includes('presentation: "browsing"'), false);
});

Deno.test("playground navigation uses focus-only menus with inspectable unavailable choices", async () => {
  const io = new FakeTerminalIO([`${DOWN}${ENTER}${DOWN}${ENTER}`], {
    columns: 70,
    rows: 20,
  });
  const navigator = createPlaygroundNavigator(io);
  assertEquals(
    await navigator.choose("contextual-menu", {
      label: "Choose",
      choices: [
        {
          id: "first",
          label: "First",
          description: "The first available route.",
          value: "first",
        },
        {
          id: "blocked",
          label: "Blocked",
          description: "Unavailable until its dependency finishes.",
          value: "blocked",
          disabled: true,
        },
        {
          id: "last",
          label: "Last",
          description: "The next available route.",
          value: "last",
        },
      ],
    }),
    "last",
  );
  assertStringIncludes(io.output(), "› × Blocked");
  assertStringIncludes(io.output(), "Unavailable until its dependency");
  assertEquals(io.output().includes("[●]"), false);
  assertEquals(io.output().includes("(disabled)"), false);
});

Deno.test("public heading treatments have one direct, concise review journey", async () => {
  assertEquals(resolvePlaygroundSelection(["heading-variants"]), {
    kind: "journey",
    id: "heading-variants",
  });
  const io = new FakeTerminalIO([], { columns: 80 });
  assertEquals(
    await runJourney(journey("heading-variants"), testRuntime(io)),
    "completed",
  );
  for (const id of ["embedded", "underline", "sandwich"]) {
    assertStringIncludes(io.output(), `[${id}]`);
  }
  assertStringIncludes(io.output(), "━━ ▲ DEPLOYING WORKSPACE CHANGES");
  assertStringIncludes(io.output(), "▲ DEPLOYING WORKSPACE CHANGES\n━━");
  assertStringIncludes(io.output(), "──\n▲ DEPLOYING WORKSPACE CHANGES\n──");
});

Deno.test("Timeline and stepper status review has a direct journey", async () => {
  assertEquals(resolvePlaygroundSelection(["motif-statuses"]), {
    kind: "journey",
    id: "motif-statuses",
  });
  const io = new FakeTerminalIO([], { columns: 52 });
  assertEquals(
    await runJourney(journey("motif-statuses"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), " ▲  Completed");
  assertStringIncludes(io.output(), "△ Now — Current [current]");
});

Deno.test("reading-foundation journeys expose path search and compact cleanup", async () => {
  const pathMatches = interactiveAdapter.filterInteractionEntries(
    documentChoices,
    "design-principles.md",
  );
  assertEquals(
    pathMatches.map(({ id }) => id),
    ["heading-orientation", "design-principles"],
  );

  const browsing = new FakeTerminalIO([ENTER], { columns: 60 });
  assertEquals(
    await runJourney(journey("browse-documents"), testRuntime(browsing)),
    "completed",
  );
  assertStringIncludes(browsing.output(), "Design principles");
  assertStringIncludes(browsing.output(), "design-principles.md");
  assertStringIncludes(
    browsing.output(),
    'Result: string "00-orientation/design-principles.md"',
  );
  assert(!browsing.output().includes("[active]"));
  assert(!browsing.output().includes("Submitted"));

  const reader = new FakeTerminalIO(["docs online\r"], {
    columns: 80,
    rows: 24,
  });
  assertEquals(
    await runJourney(journey("markdown-browser"), testRuntime(reader)),
    "completed",
  );
  assertStringIncludes(reader.output(), '"kind":"action"');
  assertStringIncludes(reader.output(), '"value":"read-online"');
  assertStringIncludes(
    reader.output(),
    "Caller effect point: the terminal is restored",
  );
  assertEquals(reader.rawTransitions, [true, false]);
  assertEquals(reader.resizeListenerCount, 0);

  const continuation = new FakeTerminalIO([ENTER], { columns: 60 });
  assertEquals(
    await runJourney(
      journey("acknowledge-compact"),
      testRuntime(continuation),
    ),
    "completed",
  );
  assertStringIncludes(continuation.output(), "Press Enter to continue.");
  assertStringIncludes(
    continuation.output(),
    "Result: compact acknowledgement cleared.",
  );
  assert(!continuation.output().includes("Submitted"));
});

Deno.test("Markdown playground senses light and dark ground before choosing the reader theme", async () => {
  const options = {
    label: "Documentation library",
    placeholder: "Search titles, descriptions, and paths",
    entries: markdownBrowserEntries,
    mouse: true,
  } as const;
  const framePrefix = "\x1b[2J\x1b[H";
  for (
    const [report, theme] of [
      ["ffff/ffff/ffff", "light"],
      ["0000/0000/0000", "dark"],
    ] as const
  ) {
    const io = new FakeTerminalIO([
      `\x1b]11;rgb:${report}\x1b\\`,
      `docs online${ENTER}`,
    ], {
      columns: 80,
      rows: 24,
      colorDepth: "ansi256",
    });
    assertEquals(
      await runJourney(journey("markdown-browser"), testRuntime(io)),
      "completed",
    );
    const frame = io.writes.find((write) => write.startsWith(framePrefix))
      ?.slice(framePrefix.length).replaceAll("\r\n", "\n");
    const expected = renderMarkdownBrowser(
      createMarkdownBrowserState(options, { columns: 80, rows: 24 }, {
        theme,
      }),
      io.capabilities(),
    );
    assertEquals(frame, expected, `${theme} ground must select ${theme} ink`);
  }
});

Deno.test("--list works without a terminal", async () => {
  const io = new FakeTerminalIO([], { interactive: false });
  await runPlayground({ kind: "list" }, testRuntime(io));
  assertStringIncludes(io.output(), "stress-ascii");
  assertEquals(io.rawTransitions, []);
});

Deno.test("interactive modes refuse a non-TTY before terminal mutation", async () => {
  for (
    const selection of [
      { kind: "hub" },
      { kind: "tour" },
      { kind: "journey", id: "text" },
    ] as const
  ) {
    const io = new FakeTerminalIO([], { interactive: false });
    await assertRejects(
      () => runPlayground(selection, testRuntime(io)),
      NonInteractiveTerminalError,
    );
    assertEquals(io.writes, []);
    assertEquals(io.rawTransitions, []);
  }
});

Deno.test("every interactive adapter export is classified for the playground", () => {
  const exportNames = Object.keys(interactiveAdapter);
  for (const name of exportNames) {
    assert(
      name in interactiveExportCoverage,
      `unclassified interactive export ${name}: add a journey or a reasoned exclusion`,
    );
  }
  for (
    const [name, classification] of Object.entries(interactiveExportCoverage)
  ) {
    assert(
      exportNames.includes(name),
      `stale coverage entry ${name} no longer exported by ./cli/interactive`,
    );
    if ("journey" in classification) {
      assert(
        journeyById(classification.journey) !== undefined,
        `coverage for ${name} names unknown journey ${classification.journey}`,
      );
    }
  }
  for (const name of exportNames) {
    if (!/^request[A-Z]/u.test(name) && name !== "createSequentialForm") {
      continue;
    }
    const classification = interactiveExportCoverage[name];
    assert(
      classification !== undefined && "journey" in classification,
      `high-level API ${name} must map to a journey, not an exclusion`,
    );
  }
  for (const name of ["withSpinner", "withDeterminateProgress"]) {
    const classification = interactiveExportCoverage[name];
    assert(
      classification !== undefined && "journey" in classification,
      `${name} must map to a journey, not an exclusion`,
    );
  }
});

Deno.test("every generated component, exemption, and sheet is reachable from the playground", () => {
  const top = browseTopChoices();
  const topIds = top.map(({ id }) => id);
  assertEquals(new Set(topIds).size, topIds.length);
  for (const group of componentGroups) {
    assert(
      top.some((choice) => choice.label === group),
      `browse omits Group ${group}`,
    );
  }
  for (const sheet of terminalFoundationSheets) {
    assert(
      top.some(({ id }) => id === `foundation-${sheet.id}`),
      `browse omits terminal foundation ${sheet.id}`,
    );
  }
  assert(top.some(({ id }) => id === "exemptions"));

  const seenSlugs = new Set<string>();
  for (const group of componentGroups) {
    const facts = listCliComponents(group);
    const choices = browseComponentChoices(group);
    for (const fact of facts) {
      const choice = choices.find(({ id }) => id === `component-${fact.slug}`);
      assert(choice !== undefined, `browse omits component ${fact.slug}`);
      if (fact.entry.stance === "exempt") {
        assertStringIncludes(choice.label, "(exempt)");
      }
      seenSlugs.add(fact.slug);
    }
  }
  assertEquals(
    seenSlugs,
    new Set(Object.keys(cliComponentRegistry)),
    "browse must cover exactly the generated registry",
  );

  const exemptions = renderCliExemptions();
  for (const [slug, entry] of Object.entries(cliComponentRegistry)) {
    if (entry.stance !== "exempt") continue;
    assertStringIncludes(exemptions, `\`${slug}\``);
    assertStringIncludes(exemptions, entry.reason);
  }
});

Deno.test("text journey validates, completes, and restores the terminal", async () => {
  const io = new FakeTerminalIO([ENTER, `Jo${ENTER}`], { columns: 40 });
  const outcome = await runJourney(journey("text"), testRuntime(io));
  assertEquals(outcome, "completed");
  assertStringIncludes(io.output(), "A display name is required.");
  assertStringIncludes(io.output(), 'Result: string "Jo"');
  assertEquals(io.rawTransitions, [true, false]);
  assert(io.writes.includes(SHOW_TERMINAL_CURSOR));
});

Deno.test("validation latch journey latches, transforms, and completes", async () => {
  const io = new FakeTerminalIO(
    ["Bad Slug!", ENTER, "\x7f".repeat(9), "ok ", ENTER],
    { columns: 60 },
  );
  const outcome = await runJourney(
    journey("validation-latch"),
    testRuntime(io),
  );
  assertEquals(outcome, "completed");
  assertStringIncludes(io.output(), "Use lowercase letters");
  assertStringIncludes(io.output(), 'Result: string "ok"');
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("Escape backs out of a journey through the shared cancellation wrapper", async () => {
  const io = new FakeTerminalIO(["\x1b"], { columns: 60 });
  const outcome = await runJourney(
    journey("validation-latch"),
    testRuntime(io),
  );
  assertEquals(outcome, "cancelled");
  assertStringIncludes(io.output(), "Journey cancelled (Dismissed.)");
  assertEquals(io.rawTransitions, [true, false]);
});

Deno.test("masked journey never echoes the secret", async () => {
  const io = new FakeTerminalIO([`hunter2${ENTER}`], { columns: 40 });
  const outcome = await runJourney(journey("masked"), testRuntime(io));
  assertEquals(outcome, "completed");
  assert(
    !io.output().includes("hunter2"),
    "masked value leaked into playground output",
  );
  assertStringIncludes(io.output(), "masked string of 7 grapheme(s)");
  assertStringIncludes(io.output(), "value withheld");
});

Deno.test("confirm journey reports its boolean and EOF cancels cleanly", async () => {
  const confirmed = new FakeTerminalIO([`y${ENTER}`], { columns: 40 });
  assertEquals(
    await runJourney(journey("confirm"), testRuntime(confirmed)),
    "completed",
  );
  assertStringIncludes(confirmed.output(), "Result: boolean true");

  const ended = new FakeTerminalIO([], { columns: 40 });
  assertEquals(
    await runJourney(journey("confirm"), testRuntime(ended)),
    "cancelled",
  );
  assertStringIncludes(ended.output(), "Journey cancelled (Input ended.)");
  assertEquals(ended.rawTransitions, [true, false]);
  assert(ended.writes.includes(SHOW_TERMINAL_CURSOR));
});

Deno.test("selection journeys report typed results", async () => {
  const single = new FakeTerminalIO([ENTER], { columns: 40 });
  assertEquals(
    await runJourney(journey("select"), testRuntime(single)),
    "completed",
  );
  assertStringIncludes(single.output(), 'Result: string "citrine"');

  const multiple = new FakeTerminalIO([" ", ENTER], { columns: 40 });
  assertEquals(
    await runJourney(journey("multiselect"), testRuntime(multiple)),
    "completed",
  );
  assertStringIncludes(
    multiple.output(),
    'Result: array ["space-1","space-2","space-4"]',
  );

  const grouped = new FakeTerminalIO([`${CTRL_A}${ENTER}`], { columns: 40 });
  assertEquals(
    await runJourney(journey("multiselect-grouped"), testRuntime(grouped)),
    "completed",
  );
  assertStringIncludes(
    grouped.output(),
    'Result: array ["canvas","canvas-raised","ink","accent","success","warning","danger"]',
  );
});

Deno.test("search and autocomplete journeys resolve through their providers", async () => {
  const search = new FakeTerminalIO([ENTER, ENTER], { columns: 48 });
  assertEquals(
    await runJourney(journey("search"), testRuntime(search)),
    "completed",
  );
  assertStringIncludes(search.output(), 'Result: string "typography/heading"');

  const autocomplete = new FakeTerminalIO([`ca\t${ENTER}`], { columns: 48 });
  assertEquals(
    await runJourney(journey("autocomplete"), testRuntime(autocomplete)),
    "completed",
  );
  assertStringIncludes(autocomplete.output(), 'Result: string "canvas"');
});

Deno.test("textarea journey submits its multiline value", async () => {
  const io = new FakeTerminalIO([CTRL_D], { columns: 60 });
  assertEquals(
    await runJourney(journey("textarea"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(
    io.output(),
    `Result: string ${
      JSON.stringify("Added a terminal playground.\nNothing else changed.")
    }`,
  );
});

Deno.test("form journey retains answers across Ctrl+U back-navigation", async () => {
  const io = new FakeTerminalIO(
    [`Ada${ENTER}`, CTRL_U, ENTER, ENTER, ENTER],
    { columns: 60 },
  );
  assertEquals(await runJourney(journey("form"), testRuntime(io)), "completed");
  assertStringIncludes(io.output(), "Back.");
  assertStringIncludes(
    io.output(),
    'Result: object {"name":"Ada","terminal":true,"confirmed":true}',
  );
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("spinner and progress journeys complete with truthful frames", async () => {
  const spinner = new FakeTerminalIO([], { columns: 24 });
  assertEquals(
    await runJourney(journey("spinner"), testRuntime(spinner)),
    "completed",
  );
  assertStringIncludes(spinner.output(), 'Result: string "woven"');
  assert(spinner.writes.includes(HIDE_TERMINAL_CURSOR));
  assert(spinner.writes.includes(SHOW_TERMINAL_CURSOR));

  const progress = new FakeTerminalIO([], { columns: 24 });
  assertEquals(
    await runJourney(journey("progress"), testRuntime(progress)),
    "completed",
  );
  assertStringIncludes(progress.output(), "[  0%]");
  assertStringIncludes(progress.output(), "[100%]");
  assertStringIncludes(progress.output(), 'Result: string "audited"');
});

Deno.test("repeated journey runs share no orchestration state", async () => {
  const runGrouped = async (): Promise<readonly string[]> => {
    const io = new FakeTerminalIO([ENTER], { columns: 40 });
    assertEquals(
      await runJourney(journey("select-grouped"), testRuntime(io)),
      "completed",
    );
    return io.writes;
  };
  assertEquals(await runGrouped(), await runGrouped());

  const runSixteen = async (): Promise<readonly string[]> => {
    const io = new FakeTerminalIO([`${END}${ENTER}`], { columns: 60 });
    assertEquals(
      await runJourney(journey("stress-visible-16"), testRuntime(io)),
      "completed",
    );
    return io.writes;
  };
  assertEquals(await runSixteen(), await runSixteen());
});

Deno.test("reopen loop drives 16-row interactions across passes and exits on demand", async () => {
  const io = new FakeTerminalIO(
    [
      ENTER,
      ENTER,
      ENTER,
      ENTER,
      ENTER,
      ENTER,
      ENTER,
      `n${ENTER}`,
    ],
    { columns: 60, rows: 30 },
  );
  assertEquals(
    await runJourney(journey("stress-reopen-loop"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), "Pass 1");
  assertStringIncludes(io.output(), "Pass 2");
  assertEquals(io.rawTransitions.length, 12);
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("label stress journey completes across graphemes and duplicates", async () => {
  const io = new FakeTerminalIO([ENTER, `${CTRL_A}${ENTER}`], { columns: 80 });
  assertEquals(
    await runJourney(journey("stress-labels"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), 'Result: string "flag-pair"');
  assertStringIncludes(io.output(), '"duplicate-first","duplicate-second"');
});

Deno.test("degraded journeys run through the synthetic environment", async () => {
  const io = new FakeTerminalIO([], { columns: 80 });
  const degraded = new FakeTerminalIO([ENTER], {
    columns: 40,
    unicode: false,
    colorDepth: "ansi256",
  });
  let received: Readonly<Record<string, string | undefined>> | undefined;
  const runtime = testRuntime(io, {
    degradedIo: (environment) => {
      received = environment;
      return degraded;
    },
  });
  assertEquals(await runJourney(journey("stress-ascii"), runtime), "completed");
  assertEquals(received?.LC_ALL, "C");
  assertStringIncludes(io.output(), "unicode no");
  assertStringIncludes(io.output(), 'Result: string "canvas"');
  assert(degraded.output().length > 0, "degraded terminal painted nothing");
  assert(
    !degraded.output().includes("┌"),
    "ASCII degradation still painted Unicode box geometry",
  );
});

Deno.test("browse journey reaches the motif sheet and returns to the hub", async () => {
  const io = new FakeTerminalIO(
    [`${END}${UP}${UP}${UP}${ENTER}`, ENTER, `${END}${ENTER}`],
    { columns: 80 },
  );
  assertEquals(
    await runJourney(journey("browse"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), "## Terminal motifs");
});

Deno.test("browse journey reaches the narration sheet and returns to the hub", async () => {
  const io = new FakeTerminalIO(
    [`${END}${UP}${UP}${ENTER}`, ENTER, `${END}${ENTER}`],
    { columns: 80 },
  );
  assertEquals(
    await runJourney(journey("browse"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), "## Narration lines");
  assertStringIncludes(io.output(), "✓ Checks passed");
});

Deno.test("browse journey walks Group, component, and example navigation", async () => {
  const io = new FakeTerminalIO(
    [
      `${DOWN}${DOWN}${ENTER}`,
      ENTER,
      ENTER,
      `${END}${ENTER}`,
      `${END}${ENTER}`,
      `${END}${ENTER}`,
      `${END}${ENTER}`,
    ],
    { columns: 80 },
  );
  assertEquals(
    await runJourney(journey("browse"), testRuntime(io)),
    "completed",
  );
  assertStringIncludes(io.output(), "Badge · ");
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("hub runs a journey, returns to its section, and quits", async () => {
  const io = new FakeTerminalIO(
    [
      ENTER,
      ENTER,
      `Jo${ENTER}`,
      ENTER,
      `${END}${ENTER}`,
      `${END}${ENTER}`,
    ],
    { columns: 60 },
  );
  await runHub(testRuntime(io));
  assertStringIncludes(io.output(), 'Result: string "Jo"');
  assertStringIncludes(io.output(), "Playground closed.");
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("tour skips a cancelled journey only after explicit consent", async () => {
  const io = new FakeTerminalIO([CTRL_C, `n${ENTER}`], { columns: 60 });
  await runTour(testRuntime(io));
  assertStringIncludes(io.output(), "Tour stop 1 of");
  assertStringIncludes(io.output(), "Journey cancelled (Cancelled.)");
  assertStringIncludes(io.output(), "Tour ended early.");
  assertEquals(io.rawTransitions.at(-1), false);
});

Deno.test("every journey survives every terminal width without throwing", async () => {
  // 14 columns preserves a ten-column semantic control area after the frame
  // and its balanced one-cell insets; narrower pure Components are covered by
  // their focused renderer tests.
  for (const columns of [14, 24, 28, 30, 31, 32, 48, 80]) {
    for (const entry of playgroundJourneys) {
      const io = new FakeTerminalIO([], { columns });
      const runtime = testRuntime(io, {
        degradedIo: () => new FakeTerminalIO([], { columns }),
      });
      const outcome = await runJourney(entry, runtime);
      assert(
        outcome === "completed" || outcome === "cancelled",
        `journey ${entry.id} at ${columns} columns returned ${outcome}`,
      );
    }
  }
});

Deno.test("journey wrapper rethrows non-cancellation faults", async () => {
  const io = new FakeTerminalIO([], { interactive: false });
  await assertRejects(
    () => runJourney(journey("select"), testRuntime(io)),
    NonInteractiveTerminalError,
  );
});
