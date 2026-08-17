/**
 * One framework-neutral authority for terminal foundation review sheets.
 * The stdout and browser Catalogues plus the Playground's static browser
 * derive their navigation and complete specimen populations from this
 * registry.
 *
 * @module
 */

import {
  composeCliBlocks,
  createCliPresenter,
  deriveTerminalMotif,
  DISCERN_TERMINAL_MOTIF,
  renderMotifActivityBeacon,
  renderMotifDivider,
  renderMotifPattern,
  renderMotifProgressFrame,
  renderMotifSectionRule,
  renderMotifSpinnerFrame,
  renderMotifWorkflowStepper,
  type SequentialStepStatus,
  type TerminalCapabilities,
  terminalMotifRepertoire,
  type TerminalThemeVariant,
} from "../src/cli/mod.ts";

/** Optional browser or stdout presentation bound across one complete sheet. */
export interface TerminalFoundationPresentation {
  readonly theme?: TerminalThemeVariant;
}

/** A reviewable animation paired with its complete static frame evidence. */
export interface TerminalFoundationAnimation {
  readonly label: string;
  readonly frames: readonly string[];
  readonly intervalMs: number;
}

/** One linkable terminal specimen within a foundation sheet. */
export interface TerminalFoundationSpecimen {
  readonly id: string;
  readonly title: string;
  readonly output: string;
  readonly animation?: TerminalFoundationAnimation;
}

/** One terminal foundation sheet shared by every Catalogue surface. */
export interface TerminalFoundationSheet {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly keywords: string;
  readonly specimens: (
    capabilities: TerminalCapabilities,
    presentation?: TerminalFoundationPresentation,
  ) => readonly TerminalFoundationSpecimen[];
}

/** One browser Search Palette destination derived from a foundation sheet. */
export interface TerminalFoundationDestination {
  readonly href: string;
  readonly title: string;
  readonly context: "Terminal foundation";
  readonly keywords: string;
}

const STEPPER_STATES = [
  "pending",
  "active",
  "complete",
  "error",
  "cancelled",
] as const satisfies readonly SequentialStepStatus[];

const CATALOGUE_CUSTOM_MOTIF = deriveTerminalMotif(
  DISCERN_TERMINAL_MOTIF,
  {
    unicode: {
      spinner: ["◴", "◷", "◶", "◵"],
      pattern: ["▵", "▹", "▿", "◃"],
      marker: "◉",
      status: { complete: "▵", incomplete: "▿" },
    },
  },
);

function themeOptions(
  presentation: TerminalFoundationPresentation | undefined,
): Readonly<{ theme?: TerminalThemeVariant }> {
  return presentation?.theme === undefined ? {} : { theme: presentation.theme };
}

function motifSpecimens(
  capabilities: TerminalCapabilities,
  presentation?: TerminalFoundationPresentation,
): readonly TerminalFoundationSpecimen[] {
  const width = Math.min(32, capabilities.columns);
  if (width < 8) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold the motif catalogue`,
    );
  }
  const appearance = themeOptions(presentation);
  const patternLength = Math.min(24, width);
  const repertoire = terminalMotifRepertoire(
    DISCERN_TERMINAL_MOTIF,
    capabilities.unicode,
  );
  const spinnerFrames = repertoire.spinner.map((_glyph, phase) =>
    renderMotifSpinnerFrame(phase, capabilities, appearance)
  );
  const progress = [0, 65, 100].map((completed) =>
    `${completed} percent\n${
      renderMotifProgressFrame({
        completed,
        total: 100,
        width,
        ...appearance,
      }, capabilities)
    }`
  ).join("\n");
  const stepper = renderMotifWorkflowStepper(
    STEPPER_STATES.map((status, phase) => ({
      label: status,
      status,
      ...(status === "active" ? { phase } : {}),
    })),
    capabilities,
    appearance,
  );
  const beaconWidth = width;
  const beaconExtent = beaconWidth - 1;
  const beaconPhases = [
    0,
    Math.floor(beaconExtent / 3),
    Math.floor(beaconExtent * 2 / 3),
    beaconExtent,
  ];
  const beacons = beaconPhases.map((phase) =>
    `phase ${phase}\n${
      renderMotifActivityBeacon({
        width: beaconWidth,
        phase,
        ...appearance,
      }, capabilities)
    }`
  ).join("\n");
  const custom = createCliPresenter(capabilities, {
    motif: CATALOGUE_CUSTOM_MOTIF,
    ...appearance,
  });
  const customSpinnerFrames = [0, 1, 2, 3].map((phase) =>
    custom.motifSpinnerFrame(phase)
  );

  return [
    {
      id: "horizontal-divider",
      title: "Horizontal divider",
      output: renderMotifDivider({
        width,
        ...appearance,
      }, capabilities),
    },
    {
      id: "left-aligned-divider",
      title: "Left-aligned divider",
      output: renderMotifDivider({
        width,
        alignment: "start",
        ...appearance,
      }, capabilities),
    },
    {
      id: "brand-register-divider",
      title: "Brand-register divider",
      output: renderMotifDivider({
        width,
        register: "brand",
        ...appearance,
      }, capabilities),
    },
    {
      id: "vertical-divider",
      title: "Vertical divider",
      output: renderMotifPattern({
        length: 5,
        orientation: "vertical",
        ...appearance,
      }, capabilities),
    },
    {
      id: "thick-ribbon",
      title: "Thick ribbon",
      output: renderMotifPattern({
        length: patternLength,
        ...appearance,
      }, capabilities),
    },
    {
      id: "spinner-phases",
      title: "Spinner phases",
      output: spinnerFrames.map((frame, phase) => `phase ${phase}\n${frame}`)
        .join("\n"),
      animation: {
        label: "Default spinner",
        frames: spinnerFrames,
        intervalMs: 120,
      },
    },
    {
      id: "determinate-progress",
      title: "Determinate progress",
      output: progress,
    },
    {
      id: "labeled-section-rule",
      title: "Labeled section rule",
      output: renderMotifSectionRule("Rule", {
        width,
        ...appearance,
      }, capabilities),
    },
    {
      id: "stepper-states",
      title: "Stepper states",
      output: stepper,
    },
    {
      id: "activity-beacon-phases",
      title: "Activity-beacon phases",
      output: beacons,
    },
    {
      id: "derived-consumer-override",
      title: "Derived consumer override",
      output: [
        customSpinnerFrames.join(" "),
        custom.motifSectionRule("Consumer override", { width }),
        custom.motifWorkflowStepper([
          { label: "Complete", status: "complete" },
          { label: "Active", status: "active", phase: 1 },
          { label: "Pending", status: "pending" },
        ]),
        custom.lead("One bound marker reaches narration too"),
      ].join("\n"),
      animation: {
        label: "Consumer spinner",
        frames: customSpinnerFrames,
        intervalMs: 120,
      },
    },
  ];
}

function narrationSpecimens(
  capabilities: TerminalCapabilities,
  presentation?: TerminalFoundationPresentation,
): readonly TerminalFoundationSpecimen[] {
  const presenter = createCliPresenter(
    capabilities,
    themeOptions(presentation),
  );
  return [
    {
      id: "success",
      title: "Success",
      output: presenter.success("Checks passed"),
    },
    {
      id: "note",
      title: "Note",
      output: presenter.note("Cache already warm"),
    },
    {
      id: "warning",
      title: "Warning",
      output: presenter.warning("Two files skipped"),
    },
    {
      id: "failure",
      title: "Failure",
      output: presenter.failure("One frame diverged"),
    },
    {
      id: "lead-in",
      title: "Lead-in",
      output: presenter.lead("Release checks"),
    },
    {
      id: "composed-rhythm",
      title: "Composed rhythm",
      output: composeCliBlocks([
        presenter.lead("Release checks"),
        [
          presenter.success("Checks passed"),
          presenter.note("Cache already warm"),
        ].join("\n"),
        presenter.warning("Two files skipped"),
      ]),
    },
  ];
}

/** Canonical set of terminal foundations visible in every Catalogue. */
export const terminalFoundationSheets = [
  {
    id: "motifs",
    title: "Terminal motifs",
    description:
      "Default and consumer-derived motifs across animation, pattern, progress, status, and narration roles.",
    keywords:
      "spinner half circle glyph pattern progress stepper activity beacon consumer override Unicode ASCII",
    specimens: motifSpecimens,
  },
  {
    id: "narration",
    title: "Narration lines",
    description:
      "Semantic success, note, warning, failure, and lead-in lines composed into terminal rhythm.",
    keywords:
      "success note warning failure lead narration rhythm status marker",
    specimens: narrationSpecimens,
  },
] as const satisfies readonly TerminalFoundationSheet[];

/** Derive browser Search Palette destinations from the canonical sheet set. */
export function terminalFoundationDestinations(
  sheets: readonly TerminalFoundationSheet[] = terminalFoundationSheets,
): readonly TerminalFoundationDestination[] {
  return sheets.map((sheet) => ({
    href: `#terminal-foundation-${sheet.id}`,
    title: sheet.title,
    context: "Terminal foundation",
    keywords: `${sheet.title} ${sheet.description} ${sheet.keywords}`,
  }));
}

/** Resolve one sheet by its stable selector. */
export function terminalFoundationSheet(
  id: string,
): TerminalFoundationSheet | undefined {
  return terminalFoundationSheets.find((sheet) => sheet.id === id);
}

/** Render one complete framework-neutral sheet for the stdout Catalogue. */
export function renderTerminalFoundationSheet(
  sheet: TerminalFoundationSheet,
  capabilities: TerminalCapabilities,
  presentation?: TerminalFoundationPresentation,
): string {
  return `## ${sheet.title}\n\n${
    sheet.specimens(capabilities, presentation).map((specimen) =>
      `### ${specimen.title}\n\n${specimen.output}`
    ).join("\n\n")
  }`;
}
