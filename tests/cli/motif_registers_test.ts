import { assertEquals, assertThrows } from "@std/assert";
import {
  defineTerminalMotif,
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
  motifPassthrough,
  type TerminalMotifDefinition,
  terminalMotifQuietMarker,
  terminalMotifRegisterRoles,
  terminalMotifRepertoire,
} from "../../src/cli/motif.ts";
import {
  renderMotifActivityBeacon,
  renderMotifDivider,
  renderMotifPattern,
  renderMotifProgressFrame,
  renderMotifSectionRule,
} from "../../src/cli/motifs.ts";
import { renderLeadLine } from "../../src/cli/narration.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const REGISTERED_DEFINITION: TerminalMotifDefinition = {
  unicode: {
    spinner: ["◴"],
    pattern: ["●", "○"],
    marker: "●",
    markerQuiet: "○",
    status: { complete: "●", incomplete: "○" },
    brand: { marker: "◆", pattern: ["◆", "◇"] },
  },
  ascii: {
    spinner: ["*"],
    pattern: ["o", "."],
    marker: "o",
    markerQuiet: ".",
    status: { complete: "+", incomplete: "-" },
    brand: { marker: "#", pattern: ["#", "="] },
  },
};

const REGISTERED_MOTIF = defineTerminalMotif(REGISTERED_DEFINITION);

const UNREGISTERED_MOTIF = defineTerminalMotif({
  unicode: {
    spinner: ["◴"],
    pattern: ["●", "○"],
    marker: "●",
    status: { complete: "●", incomplete: "○" },
  },
  ascii: {
    spinner: ["*"],
    pattern: ["o", "."],
    marker: "o",
    status: { complete: "+", incomplete: "-" },
  },
});

Deno.test("register roles resolve the brand register when defined", () => {
  const repertoire = terminalMotifRepertoire(REGISTERED_MOTIF, true);
  assertEquals(terminalMotifRegisterRoles(repertoire).marker, "●");
  assertEquals(terminalMotifRegisterRoles(repertoire, "plain").marker, "●");
  const brand = terminalMotifRegisterRoles(repertoire, "brand");
  assertEquals(brand.marker, "◆");
  assertEquals([...brand.pattern], ["◆", "◇"]);
});

Deno.test("register roles fall back to the everyday roles without a brand register", () => {
  const repertoire = terminalMotifRepertoire(UNREGISTERED_MOTIF, true);
  const brand = terminalMotifRegisterRoles(repertoire, "brand");
  assertEquals(brand.marker, "●");
  assertEquals([...brand.pattern], ["●", "○"]);
});

Deno.test("the quiet marker falls back to the everyday marker", () => {
  assertEquals(
    terminalMotifQuietMarker(terminalMotifRepertoire(REGISTERED_MOTIF, true)),
    "○",
  );
  assertEquals(
    terminalMotifQuietMarker(terminalMotifRepertoire(UNREGISTERED_MOTIF, true)),
    "●",
  );
});

Deno.test("brand and quiet roles are validated like every other role", () => {
  const base = REGISTERED_DEFINITION.unicode;
  assertThrows(
    () =>
      defineTerminalMotif({
        unicode: { ...base, brand: { marker: "◆◆", pattern: ["◆"] } },
        ascii: REGISTERED_DEFINITION.ascii,
      }),
    TypeError,
    "brand.marker",
  );
  assertThrows(
    () =>
      defineTerminalMotif({
        unicode: { ...base, brand: { marker: "◆", pattern: [] } },
        ascii: REGISTERED_DEFINITION.ascii,
      }),
    TypeError,
    "brand.pattern",
  );
  assertThrows(
    () =>
      defineTerminalMotif({
        unicode: { ...base, markerQuiet: " " },
        ascii: REGISTERED_DEFINITION.ascii,
      }),
    TypeError,
    "markerQuiet",
  );
});

Deno.test("derive replaces quiet and brand roles atomically and keeps them otherwise", () => {
  const rebranded = deriveTerminalMotif(REGISTERED_MOTIF, {
    unicode: { brand: { marker: "★", pattern: ["★"] } },
  });
  assertEquals(rebranded.unicode.brand?.marker, "★");
  assertEquals(rebranded.unicode.markerQuiet, "○");
  const remarked = deriveTerminalMotif(REGISTERED_MOTIF, {
    unicode: { marker: "◉", markerQuiet: "◌" },
  });
  assertEquals(remarked.unicode.marker, "◉");
  assertEquals(remarked.unicode.markerQuiet, "◌");
  assertEquals(remarked.unicode.brand?.marker, "◆");
});

Deno.test("motifPassthrough forwards the register without materialising absences", () => {
  assertEquals(motifPassthrough({}), {});
  assertEquals(motifPassthrough({ register: "brand" }), { register: "brand" });
  assertEquals(
    motifPassthrough({ motif: REGISTERED_MOTIF, register: "plain" }),
    { motif: REGISTERED_MOTIF, register: "plain" },
  );
});

Deno.test("the divider speaks quiet centred, everyday leading, and brand on request", () => {
  const unicode = testTerminalCapabilities({ columns: 20 });
  const motif = REGISTERED_MOTIF;
  assertExactFrame(
    renderMotifDivider({ width: 9, motif }, unicode),
    "╶── ○ ──╴",
    unicode,
  );
  assertExactFrame(
    renderMotifDivider({ width: 9, motif, alignment: "start" }, unicode),
    "●  ──────",
    unicode,
  );
  assertExactFrame(
    renderMotifDivider({ width: 9, motif, register: "brand" }, unicode),
    "╶── ◆ ──╴",
    unicode,
  );
  assertExactFrame(
    renderMotifDivider(
      { width: 9, motif, register: "brand", alignment: "start" },
      unicode,
    ),
    "◆  ──────",
    unicode,
  );
});

Deno.test("pattern, section rule, and lead line honour the brand register", () => {
  const unicode = testTerminalCapabilities({ columns: 24 });
  assertExactFrame(
    renderMotifPattern(
      { length: 4, motif: REGISTERED_MOTIF, register: "brand" },
      unicode,
    ),
    "◆◇◆◇",
    unicode,
  );
  assertEquals(
    stripAnsi(renderMotifSectionRule("Gate", {
      width: 16,
      motif: REGISTERED_MOTIF,
      register: "brand",
    }, unicode)),
    "━━ ◆ GATE ━━━━━━",
  );
  assertEquals(
    stripAnsi(
      renderLeadLine(
        { text: "Gate", motif: REGISTERED_MOTIF, register: "brand" },
        unicode,
      ),
    ),
    "◆ GATE",
  );
});

Deno.test("progress and beacon accept an explicit one-cell marker", () => {
  const unicode = testTerminalCapabilities({ columns: 20 });
  assertExactFrame(
    renderMotifProgressFrame(
      { completed: 1, total: 4, width: 12, motif: REGISTERED_MOTIF },
      unicode,
    ),
    "[ 25%] ━●───",
    unicode,
  );
  assertExactFrame(
    renderMotifProgressFrame({
      completed: 1,
      total: 4,
      width: 12,
      motif: REGISTERED_MOTIF,
      marker: "▶",
    }, unicode),
    "[ 25%] ━▶───",
    unicode,
  );
  assertExactFrame(
    renderMotifActivityBeacon(
      { width: 8, phase: 2, motif: REGISTERED_MOTIF, marker: "▴" },
      unicode,
    ),
    "──▴─────",
    unicode,
  );
  assertThrows(
    () =>
      renderMotifProgressFrame(
        { completed: 0, total: 1, width: 12, marker: "◆◆" },
        unicode,
      ),
    TypeError,
    "progress marker",
  );
  assertThrows(
    () =>
      renderMotifActivityBeacon({ width: 8, phase: 0, marker: " " }, unicode),
    TypeError,
    "beacon marker",
  );
});

Deno.test("the discern default carries its brand register explicitly", () => {
  const unicode = terminalMotifRepertoire(DISCERN_TERMINAL_MOTIF, true);
  assertEquals(unicode.brand?.marker, "◮");
  assertEquals([...(unicode.brand?.pattern ?? [])], ["◮", "⧩", "◭", "⧨"]);
  const ascii = terminalMotifRepertoire(DISCERN_TERMINAL_MOTIF, false);
  assertEquals(ascii.brand?.marker, ">");
});
