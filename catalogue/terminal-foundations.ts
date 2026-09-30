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
  fillStyledLine,
  type KeyHints,
  measureText,
  padText,
  renderBox,
  renderKeyHintsCli,
  renderMotifActivityBeacon,
  renderMotifDivider,
  renderMotifPattern,
  renderMotifProgressFrame,
  renderMotifSectionRule,
  renderMotifSpinnerFrame,
  renderMotifWorkflowStepper,
  resolveTerminalTheme,
  type SequentialStepStatus,
  styleText,
  TERMINAL_GLYPHS,
  TERMINAL_SURFACE_ROLES,
  TERMINAL_TEXT_TONES,
  type TerminalCapabilities,
  terminalGlyph,
  type TerminalGlyphColumn,
  type TerminalGlyphName,
  terminalMotifRepertoire,
  terminalPaintsSurfaces,
  type TerminalSurfaceRole,
  type TerminalTextTone,
  terminalTextToneColor,
  type TerminalThemeOptions,
  truncateText,
} from "../src/cli/mod.ts";

/** Optional browser or stdout presentation bound across one complete sheet. */
export type TerminalFoundationPresentation = TerminalThemeOptions;

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
  /** Browser-gallery grouping; ordering still follows the specimen registry. */
  readonly group?: string;
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

function presentationOptions(
  presentation: TerminalFoundationPresentation | undefined,
): TerminalThemeOptions {
  return presentation ?? {};
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
  const appearance = presentationOptions(presentation);
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
      group: "Dividers and pattern",
      output: renderMotifDivider({
        width,
        ...appearance,
      }, capabilities),
    },
    {
      id: "left-aligned-divider",
      title: "Left-aligned divider",
      group: "Dividers and pattern",
      output: renderMotifDivider({
        width,
        alignment: "start",
        ...appearance,
      }, capabilities),
    },
    {
      id: "brand-register-divider",
      title: "Brand-register divider",
      group: "Dividers and pattern",
      output: renderMotifDivider({
        width,
        register: "brand",
        ...appearance,
      }, capabilities),
    },
    {
      id: "vertical-divider",
      title: "Vertical divider",
      group: "Dividers and pattern",
      output: renderMotifPattern({
        length: 5,
        orientation: "vertical",
        ...appearance,
      }, capabilities),
    },
    {
      id: "thick-ribbon",
      title: "Thick ribbon",
      group: "Dividers and pattern",
      output: renderMotifPattern({
        length: patternLength,
        ...appearance,
      }, capabilities),
    },
    {
      id: "spinner-phases",
      title: "Spinner phases",
      group: "Progress and activity",
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
      group: "Progress and activity",
      output: progress,
    },
    {
      id: "labeled-section-rule",
      title: "Labeled section rule",
      group: "Structure and state",
      output: renderMotifSectionRule("Rule", {
        width,
        ...appearance,
      }, capabilities),
    },
    {
      id: "stepper-states",
      title: "Stepper states",
      group: "Structure and state",
      output: stepper,
    },
    {
      id: "activity-beacon-phases",
      title: "Activity-beacon phases",
      group: "Structure and state",
      output: beacons,
    },
    {
      id: "derived-consumer-override",
      title: "Derived consumer override",
      group: "Customisation",
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
    presentationOptions(presentation),
  );
  return [
    {
      id: "success",
      title: "Success",
      group: "Semantic lines",
      output: presenter.success("Checks passed"),
    },
    {
      id: "note",
      title: "Note",
      group: "Semantic lines",
      output: presenter.note("Cache already warm"),
    },
    {
      id: "warning",
      title: "Warning",
      group: "Semantic lines",
      output: presenter.warning("Two files skipped"),
    },
    {
      id: "failure",
      title: "Failure",
      group: "Semantic lines",
      output: presenter.failure("One frame diverged"),
    },
    {
      id: "lead-in",
      title: "Lead-in",
      group: "Semantic lines",
      output: presenter.lead("Release checks"),
    },
    {
      id: "composed-rhythm",
      title: "Composed rhythm",
      group: "Composed rhythm",
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

const SURFACE_LABELS: Readonly<Record<TerminalSurfaceRole, string>> = {
  surface: "Surface",
  raised: "Raised",
  selection: "Selection",
  selectionMuted: "Receded selection",
  control: "Control",
  focusFill: "Focused control",
  dangerFill: "Focused danger",
};

const GLYPH_COLUMNS: readonly TerminalGlyphColumn[] = [
  "state",
  "fold",
  "mark",
  "flag",
  "menu",
  "button",
  "chrome",
  "key",
];

interface SampleRow {
  readonly glyph: TerminalGlyphName;
  readonly tone: TerminalTextTone;
  readonly title: string;
  readonly label: string;
  readonly age: string;
}

const SAMPLE_ROWS: readonly SampleRow[] = [
  {
    glyph: "done",
    tone: "success",
    title: "Refresh the index",
    label: "Ready",
    age: "20m",
  },
  {
    glyph: "failed",
    tone: "danger",
    title: "Rebuild the cache",
    label: "Failed",
    age: "2h",
  },
  {
    glyph: "attention",
    tone: "warning",
    title: "Rename the export",
    label: "Stale",
    age: "11d",
  },
  {
    glyph: "idle",
    tone: "faint",
    title: "Tidy the notes",
    label: "Idle",
    age: "2d",
  },
];

const SAMPLE_HINTS: KeyHints = {
  left: [
    { key: "enter", label: "Open…" },
    { key: "v", label: "View details" },
    { key: "g", label: "Approve…" },
  ],
  right: [
    { key: ".", label: "Actions" },
    { key: "ctrl-k", label: "Commands" },
  ],
  extra: [
    { key: "?", label: "Keys" },
    { key: "/", label: "Filter" },
    { key: "q", label: "Quit" },
  ],
};

function surfaceSpecimens(
  capabilities: TerminalCapabilities,
  presentation?: TerminalFoundationPresentation,
): readonly TerminalFoundationSpecimen[] {
  const width = Math.min(48, capabilities.columns);
  if (width < 32) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold the surface catalogue`,
    );
  }
  const options = presentationOptions(presentation);
  const theme = resolveTerminalTheme(options);
  const painted = terminalPaintsSurfaces(capabilities);
  const text = (
    value: string,
    tone: TerminalTextTone,
    surface?: TerminalSurfaceRole,
    bold = false,
  ): string =>
    styleText(value, {
      color: terminalTextToneColor(theme, tone, surface),
      ...(bold ? { bold: true } : {}),
    }, capabilities);
  const fill = (content: string, surface: TerminalSurfaceRole): string =>
    fillStyledLine(content, width, {
      background: theme.surfaces[surface],
    }, capabilities);

  const ladder = TERMINAL_SURFACE_ROLES.flatMap((surface) => [
    fill(`  ${text(SURFACE_LABELS[surface], "ink", surface, true)}`, surface),
    fill(
      `  ${
        TERMINAL_TEXT_TONES.map((tone) => text(tone, tone, surface)).join(" ")
      }`,
      surface,
    ),
  ]).join("\n");

  const row = (
    sample: SampleRow,
    selection: "selection" | "selectionMuted" | undefined,
  ): string => {
    const surface = selection;
    const marker = selection === undefined ? " " : text(
      terminalGlyph("selection", capabilities),
      selection === "selection" ? "accent" : "faint",
      surface,
    );
    const title = padText(truncateText(sample.title, width - 22), width - 22);
    const content = `${marker} ${
      text(terminalGlyph(sample.glyph, capabilities), sample.tone, surface)
    } ${text(title, "ink", surface, selection === "selection")}${
      text(padText(sample.label, 9, "end"), sample.tone, surface)
    }  ${text(padText(sample.age, 4, "end"), "faint", surface)}`;
    return surface === undefined ? padText(content, width) : fill(
      content,
      surface,
    );
  };
  const list = (selection: "selection" | "selectionMuted"): string =>
    SAMPLE_ROWS.map((sample, index) =>
      row(sample, index === 0 ? selection : undefined)
    ).join("\n");

  const button = (
    label: string,
    state: "focused" | "resting" | "disabled",
    danger: boolean,
  ): string => {
    if (!painted) {
      const [open, close] = state === "focused"
        ? [
          terminalGlyph("focusStart", capabilities),
          terminalGlyph("focusEnd", capabilities),
        ]
        : state === "resting"
        ? ["[", "]"]
        : ["(", ")"];
      return styleText(
        `${open} ${label} ${close}`,
        state === "focused" ? { bold: true } : {},
        capabilities,
      );
    }
    const surface: TerminalSurfaceRole = state === "focused"
      ? danger ? "dangerFill" : "focusFill"
      : state === "resting"
      ? "control"
      : "surface";
    const tone: TerminalTextTone = state === "disabled"
      ? "faint"
      : danger
      ? "danger"
      : "ink";
    const [open, close] = state === "focused"
      ? [
        terminalGlyph("focusStart", capabilities),
        terminalGlyph("focusEnd", capabilities),
      ]
      : [" ", " "];
    return styleText(`${open} ${label} ${close}`, {
      background: theme.surfaces[surface],
      color: terminalTextToneColor(theme, tone, surface),
      ...(state === "focused" ? { bold: true } : {}),
    }, capabilities);
  };
  const buttons = [
    `${button("Keep", "focused", false)}  ${button("Park", "resting", false)}`,
    `${button("Drop", "focused", true)}  ${button("Drop", "resting", true)}  ${
      button("Drop", "disabled", true)
    }`,
  ].join("\n");

  const consequence = (glyph: TerminalGlyphName, line: string) =>
    `${text(terminalGlyph(glyph, capabilities), "muted", "raised")}  ${
      text(line, "ink", "raised")
    }`;
  const panel = renderBox({
    title: "Apply the change?",
    width,
    padding: 2,
    style: painted ? "none" : "rounded",
    fill: { background: theme.surfaces.raised },
    borderStyle: { bold: true, color: terminalTextToneColor(theme, "ink") },
    body: [
      "",
      consequence("changes", "Updates 4 files in place"),
      consequence("removes", "Removes the scratch copy"),
      consequence("keeps", "Keeps the recorded history"),
      consequence("restorable", "Can be restored for a while"),
      "",
      text("Nothing changes until you confirm.", "faint", "raised"),
    ].join("\n"),
  }, capabilities);

  const hints = [
    renderKeyHintsCli(SAMPLE_HINTS, width, capabilities, options),
    renderKeyHintsCli(SAMPLE_HINTS, Math.min(36, width), capabilities, options),
  ].join("\n");

  const glyphTable = GLYPH_COLUMNS.flatMap((column) => {
    const lines: string[] = [];
    let line = padText(column, 8);
    for (
      const glyph of Object.values(TERMINAL_GLYPHS).filter((entry) =>
        entry.column === column
      )
    ) {
      const entry = `${glyph.unicode} ${glyph.ascii}`;
      const separated = line.trim() === column ? entry : `  ${entry}`;
      if (
        measureText(line) + measureText(separated) > width &&
        line.trim() !== column
      ) {
        lines.push(line);
        line = `${" ".repeat(8)}${entry}`;
      } else line += separated;
    }
    return [...lines, line];
  }).join("\n");

  return [
    {
      id: "surface-ladder",
      title: "Surface roles and text tones",
      group: "Surfaces",
      output: ladder,
    },
    {
      id: "raised-panel",
      title: "Raised panel",
      group: "Surfaces",
      output: panel,
    },
    {
      id: "selection",
      title: "Selection",
      group: "Selection and focus",
      output: list("selection"),
    },
    {
      id: "receded-selection",
      title: "Receded selection",
      group: "Selection and focus",
      output: list("selectionMuted"),
    },
    {
      id: "buttons",
      title: "Buttons",
      group: "Selection and focus",
      output: buttons,
    },
    {
      id: "key-hints",
      title: "Key hints",
      group: "Key hints and glyphs",
      output: hints,
    },
    {
      id: "glyph-table",
      title: "Glyph table",
      group: "Key hints and glyphs",
      output: glyphTable,
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
  {
    id: "surfaces",
    title: "Terminal surfaces",
    description:
      "Surface fills, selection, buttons, a raised panel, key hints, and the glyph table across every colour depth.",
    keywords:
      "surface raised selection focus control button panel fill key hints glyph table NO_COLOR 256 16 colour",
    specimens: surfaceSpecimens,
  },
] as const satisfies readonly TerminalFoundationSheet[];

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
