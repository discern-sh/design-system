import type { TerminalCapabilities } from "../src/cli/capabilities.ts";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";
import type { TerminalLabCapability } from "./terminal-lab-state.ts";
import {
  composeCliBlocks,
  createCliPresenter,
  renderBranchChoiceCli,
  renderCommandGroupCli,
  renderDiagnosticCli,
  renderDocsHeaderCli,
  renderExpectedResultCli,
  renderFleetCli,
  renderPagerCli,
  renderResultSummaryCli,
  renderRetryNoticeCli,
  renderSectionCli,
  renderSelectCli,
} from "../src/cli/mod.ts";
import { renderMarkdownBrowserCatalogueFrame } from "./markdown-browser-example.ts";

/** A complete Catalogue-only CLI recipe built from public package renderers. */
export interface CliCompositionRecipe {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Component slugs assembled by this Catalogue-only recipe. */
  readonly components: readonly string[];
  /** Capability facts whose changes this recipe can visibly exercise. */
  readonly capabilityControls: readonly TerminalLabCapability[];
  readonly render: (
    capabilities: TerminalCapabilities,
    theme?: TerminalThemeVariant,
    rows?: number,
  ) => string;
  readonly source: string;
}

interface CliRecipeDefinition<Definition> {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly components: readonly string[];
  readonly capabilityControls: readonly TerminalLabCapability[];
  readonly definition: Definition;
  readonly render: (
    definition: Definition,
    capabilities: TerminalCapabilities,
    theme: TerminalThemeVariant,
    rows: number,
  ) => string;
  readonly source: (definition: Definition) => string;
}

function defineCliRecipe<Definition>(
  recipe: CliRecipeDefinition<Definition>,
): CliCompositionRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    components: recipe.components,
    capabilityControls: recipe.capabilityControls,
    render: (capabilities, theme = "dark", rows = 24) =>
      recipe.render(recipe.definition, capabilities, theme, rows),
    source: recipe.source(recipe.definition),
  };
}

function value(source: unknown): string {
  return JSON.stringify(source, null, 2);
}

const operationalStatus = {
  summary: {
    state: "changed" as const,
    fact: "Three workstreams are active; one needs attention.",
    counts: [
      { label: "Active", value: "3" },
      { label: "Ready", value: "1" },
      { label: "Attention", value: "1" },
    ],
    nextAction: "Update the waiting workstream before it lands.",
  },
  fleet: [
    {
      persona: "Renderer",
      branch: "change/renderer",
      status: "working" as const,
      ahead: 4,
      behind: 0,
      beaconPhase: 2,
    },
    {
      persona: "Reference",
      branch: "change/reference",
      status: "waiting" as const,
      ahead: 2,
      behind: 1,
    },
    {
      persona: "Tests",
      branch: "change/tests",
      status: "done" as const,
      ahead: 3,
      behind: 0,
    },
  ],
  checkout:
    "Branch: main\nState: Clean\nLatest accepted change: Improve layout fitting",
  choices: [
    {
      label: "Recommended",
      path: "Update the waiting workstream",
    },
    { label: "Inspect", path: "Open its detailed evidence" },
  ],
} as const;

const operationalStatusRecipe = defineCliRecipe({
  id: "operational-status",
  title: "Operational status",
  description:
    "A decision brief that moves from overall state to workstreams, checkout facts, and the next valid action.",
  components: [
    "docs-header",
    "result-summary",
    "fleet",
    "section",
    "branch-choice",
  ],
  capabilityControls: ["unicode", "colorDepth"],
  definition: operationalStatus,
  render: (definition, capabilities, theme) => {
    const presenter = createCliPresenter(capabilities, { theme });
    return composeCliBlocks([
      presenter.present(renderDocsHeaderCli, {
        brand: "Project status",
        middle: "Current work and landing readiness",
      }),
      presenter.present(renderResultSummaryCli, {
        ...definition.summary,
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderFleetCli, {
        label: "Workstreams",
        rows: definition.fleet,
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderSectionCli, {
        title: "Main checkout",
        body: definition.checkout,
        spacing: "sm",
        width: capabilities.columns,
      }),
      presenter.present(renderBranchChoiceCli, {
        title: "Next steps",
        choices: definition.choices,
        maxWidth: capabilities.columns,
      }),
    ]);
  },
  source: (definition) =>
    `import {
  composeCliBlocks,
  createCliPresenter,
  renderBranchChoiceCli,
  renderDocsHeaderCli,
  renderFleetCli,
  renderResultSummaryCli,
  renderSectionCli,
} from "@discern-sh/design-system/cli";

const definition = ${value(definition)} as const;
const presenter = createCliPresenter(capabilities);

const output = composeCliBlocks([
  presenter.present(renderDocsHeaderCli, {
    brand: "Project status",
    middle: "Current work and landing readiness",
  }),
  presenter.present(renderResultSummaryCli, {
    ...definition.summary,
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderFleetCli, {
    label: "Workstreams",
    rows: definition.fleet,
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderSectionCli, {
    title: "Main checkout",
    body: definition.checkout,
    spacing: "sm",
    width: capabilities.columns,
  }),
  presenter.present(renderBranchChoiceCli, {
    title: "Next steps",
    choices: definition.choices,
    maxWidth: capabilities.columns,
  }),
]);`,
});

const failureReport = {
  summary: {
    state: "failed" as const,
    fact: "Configuration validation stopped before any changes were applied.",
    counts: [{ label: "Errors", value: "1" }],
    duration: "0.4s",
    nextAction: "Correct the timeout value, then validate again.",
  },
  diagnostic: {
    title: "Timeout has the wrong type",
    impact: "The configuration cannot be loaded safely.",
    correction: "Replace the quoted value with a number of seconds.",
    severity: "failure" as const,
    path: "config/project.toml",
    line: 12,
    evidence: 'timeout: expected number, received "fast"',
    retryCommand: "tool validate config/project.toml",
  },
  retry: {
    safeToRetry: true,
    label: "after correction",
    reason: "Validation is read-only and no external effect has occurred.",
  },
} as const;

const failureReportRecipe = defineCliRecipe({
  id: "failure-report",
  title: "Failure report",
  description:
    "A failed result, precise diagnostic, correction, and explicit retry decision in reading order.",
  components: [
    "docs-header",
    "result-summary",
    "diagnostic",
    "retry-notice",
  ],
  capabilityControls: ["unicode", "colorDepth"],
  definition: failureReport,
  render: (definition, capabilities, theme) => {
    const presenter = createCliPresenter(capabilities, { theme });
    return composeCliBlocks([
      presenter.present(renderDocsHeaderCli, {
        brand: "Validation report",
        middle: "Configuration check",
      }),
      presenter.present(renderResultSummaryCli, {
        ...definition.summary,
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderDiagnosticCli, {
        ...definition.diagnostic,
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderRetryNoticeCli, {
        ...definition.retry,
        maxWidth: capabilities.columns,
      }),
    ]);
  },
  source: (definition) =>
    `import {
  composeCliBlocks,
  createCliPresenter,
  renderDiagnosticCli,
  renderDocsHeaderCli,
  renderResultSummaryCli,
  renderRetryNoticeCli,
} from "@discern-sh/design-system/cli";

const definition = ${value(definition)} as const;
const presenter = createCliPresenter(capabilities);

const output = composeCliBlocks([
  presenter.present(renderDocsHeaderCli, {
    brand: "Validation report",
    middle: "Configuration check",
  }),
  presenter.present(renderResultSummaryCli, {
    ...definition.summary,
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderDiagnosticCli, {
    ...definition.diagnostic,
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderRetryNoticeCli, {
    ...definition.retry,
    maxWidth: capabilities.columns,
  }),
]);`,
});

const commandReference = {
  introduction:
    "Use the short check while iterating. Run the complete verification before handing work over.",
  commands: [
    {
      label: "Fast check",
      command: "tool check",
      explanation: "Validate formatting and types.",
      expectedResult: "The changed source is internally consistent.",
    },
    {
      label: "Complete verification",
      command: "tool verify",
      explanation: "Run checks, tests, and artifact verification.",
      expectedResult: "Every configured verification stage passes.",
    },
  ],
  completion:
    "The complete verification passes and the working tree remains clean.",
} as const;

const commandReferenceRecipe = defineCliRecipe({
  id: "command-reference",
  title: "Command reference",
  description:
    "A compact reference page with context, ordered commands, expected evidence, and adjacent navigation.",
  components: [
    "docs-header",
    "section",
    "command-group",
    "expected-result",
    "pager",
  ],
  capabilityControls: ["unicode", "colorDepth", "hyperlinks"],
  definition: commandReference,
  render: (definition, capabilities, theme) => {
    const presenter = createCliPresenter(capabilities, { theme });
    return composeCliBlocks([
      presenter.present(renderDocsHeaderCli, {
        brand: "Command reference",
        middle: "Checks and verification",
        actions: ["Search", "Contents"],
      }),
      presenter.present(renderSectionCli, {
        title: "Choose the right check",
        body: definition.introduction,
        spacing: "sm",
        width: capabilities.columns,
      }),
      presenter.present(renderCommandGroupCli, {
        title: "Commands",
        items: definition.commands,
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderExpectedResultCli, {
        label: "Complete when",
        value: definition.completion,
        variant: "state",
        maxWidth: capabilities.columns,
      }),
      presenter.present(renderPagerCli, {
        previous: { label: "Configuration", href: "/reference/configuration" },
        next: { label: "Troubleshooting", href: "/reference/troubleshooting" },
        maxWidth: capabilities.columns,
      }),
    ]);
  },
  source: (definition) =>
    `import {
  composeCliBlocks,
  createCliPresenter,
  renderCommandGroupCli,
  renderDocsHeaderCli,
  renderExpectedResultCli,
  renderPagerCli,
  renderSectionCli,
} from "@discern-sh/design-system/cli";

const definition = ${value(definition)} as const;
const presenter = createCliPresenter(capabilities);

const output = composeCliBlocks([
  presenter.present(renderDocsHeaderCli, {
    brand: "Command reference",
    middle: "Checks and verification",
    actions: ["Search", "Contents"],
  }),
  presenter.present(renderSectionCli, {
    title: "Choose the right check",
    body: definition.introduction,
    spacing: "sm",
    width: capabilities.columns,
  }),
  presenter.present(renderCommandGroupCli, {
    title: "Commands",
    items: definition.commands,
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderExpectedResultCli, {
    label: "Complete when",
    value: definition.completion,
    variant: "state",
    maxWidth: capabilities.columns,
  }),
  presenter.present(renderPagerCli, {
    previous: { label: "Configuration", href: "/reference/configuration" },
    next: { label: "Troubleshooting", href: "/reference/troubleshooting" },
    maxWidth: capabilities.columns,
  }),
]);`,
});

const guidedChoice = {
  introduction:
    "Choose the update channel that matches the stability required by this environment.",
  options: [
    { kind: "group-heading" as const, id: "recommended", label: "Recommended" },
    {
      id: "stable",
      label: "Stable — tested releases with the longest support window",
    },
    { id: "preview", label: "Preview — early access to finished features" },
    { kind: "group-heading" as const, id: "advanced", label: "Advanced" },
    { id: "nightly", label: "Nightly — latest integration build" },
    { id: "local", label: "Local artifact", disabled: true },
  ],
} as const;

const guidedChoiceRecipe = defineCliRecipe({
  id: "guided-choice",
  title: "Guided choice",
  description:
    "A complete interactive decision frame that exercises responsive label wrapping, semantic groups, and hidden-choice disclosure.",
  components: ["docs-header", "section", "select"],
  capabilityControls: ["unicode", "colorDepth"],
  definition: guidedChoice,
  render: (definition, capabilities, theme) => {
    const presenter = createCliPresenter(capabilities, { theme });
    return composeCliBlocks([
      presenter.present(renderDocsHeaderCli, {
        brand: "Setup",
        middle: "Update preferences",
      }),
      presenter.present(renderSectionCli, {
        title: "Release channel",
        body: definition.introduction,
        spacing: "sm",
        width: capabilities.columns,
      }),
      presenter.note("Use the arrow keys to move; Enter confirms the choice."),
      presenter.present(renderSelectCli, {
        kind: "select",
        label: "Channel",
        options: definition.options,
        highlightedIndex: 1,
        selectedId: "stable",
        visibleStart: 0,
        visibleCount: 4,
        lifecycle: { status: "active" },
      }),
    ]);
  },
  source: (definition) =>
    `import {
  composeCliBlocks,
  createCliPresenter,
  renderDocsHeaderCli,
  renderSectionCli,
  renderSelectCli,
} from "@discern-sh/design-system/cli";

const definition = ${value(definition)} as const;
const presenter = createCliPresenter(capabilities);

const output = composeCliBlocks([
  presenter.present(renderDocsHeaderCli, {
    brand: "Setup",
    middle: "Update preferences",
  }),
  presenter.present(renderSectionCli, {
    title: "Release channel",
    body: definition.introduction,
    spacing: "sm",
    width: capabilities.columns,
  }),
  presenter.note("Use the arrow keys to move; Enter confirms the choice."),
  presenter.present(renderSelectCli, {
    kind: "select",
    label: "Channel",
    options: definition.options,
    highlightedIndex: 1,
    selectedId: "stable",
    visibleStart: 0,
    visibleCount: 4,
    lifecycle: { status: "active" },
  }),
]);`,
});

const markdownBrowserRecipe: CliCompositionRecipe = {
  id: "markdown-browser",
  title: "Markdown browser",
  description:
    "A keyboard-complete grouped reader with addressable links, caller-owned resolution, and optional terminal-cell pointer input.",
  components: ["markdown"],
  capabilityControls: ["unicode", "colorDepth", "hyperlinks"],
  render: (capabilities, theme = "dark", rows = 24) =>
    renderMarkdownBrowserCatalogueFrame(
      capabilities,
      rows,
      theme,
      "split-reader",
    ),
  source: `import {
  createMarkdownBrowserState,
  renderMarkdownBrowser,
  transitionMarkdownBrowser,
} from "@discern-sh/design-system/cli/interactive";

const entries = [
  { kind: "group-heading", id: "guides", label: "Guides" },
  {
    kind: "document",
    id: "start",
    label: "Getting started",
    path: "guides/getting-started.md",
    source: "# Getting started\\n\\n[Details](#details)\\n\\n## Details\\n\\nPackage-supplied Markdown.",
  },
  { kind: "exit", id: "quit", label: "Quit" },
] as const;

let state = createMarkdownBrowserState(
  { label: "Documentation", entries },
  { columns: capabilities.columns, rows: 24 },
);
state = transitionMarkdownBrowser(
  state,
  { kind: "key", key: { kind: "named", name: "enter" } },
  capabilities,
).state;
state = transitionMarkdownBrowser(
  state,
  { kind: "key", key: { kind: "text", text: "]" } },
  capabilities,
).state;

const output = renderMarkdownBrowser(state, capabilities);`,
};

/** Complete terminal pages shown through the Catalogue layout inspector. */
export const cliCompositionRecipes: readonly CliCompositionRecipe[] = [
  operationalStatusRecipe,
  failureReportRecipe,
  commandReferenceRecipe,
  guidedChoiceRecipe,
  markdownBrowserRecipe,
];
