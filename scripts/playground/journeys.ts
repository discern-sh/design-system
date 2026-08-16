/**
 * The playground's journey inventory: focused live journeys for every
 * high-level interactive API, stress and lifecycle review cases, and the
 * static-catalogue sheets. Journeys drive only the public exports of
 * `./cli` and `./cli/interactive`; they own no interaction machinery, key
 * decoding, painting, or raw-terminal handling of their own.
 *
 * @module
 */

import {
  createSequentialForm,
  InteractionCancelled,
  MarkdownBrowserRefusalError,
  type MarkdownBrowserResult,
  requestAcknowledgement,
  requestAutocomplete,
  requestConfirmation,
  requestMarkdownBrowser,
  requestMaskedText,
  requestSearch,
  requestSearchSelections,
  requestSelection,
  requestSelections,
  requestText,
  requestTextarea,
  segmentGraphemes,
  senseTerminalBackground,
  withActivityLog,
  withDeterminateProgress,
  withSpinner,
} from "../../src/cli/interactive/mod.ts";
import {
  detectTerminalCapabilities,
  measureText,
  renderMotifPattern,
  renderMotifSectionRule,
  renderMotifWorkflowStepper,
  renderTimelineCli,
  type TerminalCapabilities,
} from "../../src/cli/mod.ts";
import { defaultTerminalFrameWidth } from "../../src/cli/frame-measure.ts";
import { renderCliExemptions } from "../cli-inventory.ts";
import {
  renderTerminalFoundationSheet,
  terminalFoundationSheet,
} from "../../catalogue/terminal-foundations.ts";
import { describeCapabilities, renderTerminalFacts } from "./banner.ts";
import { runBrowseJourney } from "./browse.ts";
import { runHeadingVariantsJourney } from "./heading-variants.ts";
import {
  documentChoices,
  longGroupedChoices,
  markdownBrowserEntries,
  searchGroupedEntries,
  spacingChoices,
  swatchChoices,
  tokenNameSuggestions,
  tokenRoleChoices,
  unicodeStressChoices,
} from "./fixtures.ts";
import type { PlaygroundJourney, PlaygroundRuntime } from "./types.ts";

/**
 * Render a journey heading that can never throw: the motif section rule
 * when the title fits its width contract with margin to spare, otherwise
 * the plain title. Playground chrome must not crash any terminal a
 * journey is reviewing.
 */
function journeyHeading(
  title: string,
  capabilities: TerminalCapabilities,
): string {
  const width = defaultTerminalFrameWidth(capabilities);
  if (measureText(title) + 6 <= width) {
    return renderMotifSectionRule(title, { width }, capabilities);
  }
  return title;
}

/**
 * The one environment fact background sensing falls back to, read defensively
 * so a permission-restricted run simply presents no hint.
 */
function colorfgbgSnapshot(): Readonly<Record<string, string | undefined>> {
  try {
    const value = Deno.env.get("COLORFGBG");
    return value === undefined ? {} : { COLORFGBG: value };
  } catch {
    return {};
  }
}

function describeResult(value: unknown): string {
  if (value === undefined) return "undefined (nothing selected)";
  if (typeof value === "string") return `string ${JSON.stringify(value)}`;
  if (typeof value === "boolean" || typeof value === "number") {
    return `${typeof value} ${String(value)}`;
  }
  if (Array.isArray(value)) return `array ${JSON.stringify(value)}`;
  return `object ${JSON.stringify(value)}`;
}

function report(runtime: PlaygroundRuntime, value: unknown): void {
  runtime.print(`Result: ${describeResult(value)}`);
}

function visibleCountJourney(
  id: string,
  title: string,
  description: string,
  visibleCount: number | undefined,
): PlaygroundJourney {
  return {
    id,
    title,
    section: "Stress & lifecycle",
    description,
    run: async (runtime) => {
      const value = await requestSelection({
        label: title,
        choices: longGroupedChoices,
        hint: visibleCount === undefined
          ? "Default rows; PageUp/PageDown jump a window."
          : `${visibleCount} rows; PageUp/PageDown jump a window.`,
        ...(visibleCount === undefined ? {} : { visibleCount }),
      }, { io: runtime.io });
      report(runtime, value);
    },
  };
}

function degradedJourney(
  id: string,
  title: string,
  description: string,
  environment: Readonly<Record<string, string | undefined>>,
  relaunch: string,
): PlaygroundJourney {
  return {
    id,
    title,
    section: "Stress & lifecycle",
    description,
    run: async (runtime) => {
      const { io, print } = runtime;
      const synthetic = detectTerminalCapabilities({
        env: environment,
        isTty: true,
        columns: io.size().columns,
      });
      print(`Synthetic detection: ${describeCapabilities(synthetic)}`);
      const degraded = runtime.degradedIo(environment);
      const value = await requestSelection({
        label: title,
        choices: tokenRoleChoices,
        hint: "Capabilities come from the synthetic env.",
      }, { io: degraded });
      report(runtime, value);
      print(`Relaunch fully degraded: ${relaunch}`);
    },
  };
}

const interactiveApiJourneys: readonly PlaygroundJourney[] = [
  {
    id: "text",
    title: "Text input",
    section: "Interactive APIs",
    description:
      "Grapheme-aware single-line editing with placeholder, hint, and a validator.",
    run: async (runtime) => {
      const value = await requestText({
        label: "Display name",
        placeholder: "Ada Lovelace",
        hint: "Submit empty input to see validation.",
        required: "A display name is required.",
        validate: (candidate) =>
          segmentGraphemes(candidate).length < 2
            ? "Give at least two characters."
            : undefined,
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "validation-latch",
    title: "Validation latch and transform",
    section: "Interactive APIs",
    description:
      "After one failed submission the message tracks every edit until the value passes; input is trimmed before the asynchronous validator sees it. Escape backs out.",
    run: async (runtime) => {
      const value = await requestText({
        label: "Kebab-case slug",
        placeholder: "my-component",
        hint: "Submit something invalid, then watch the message track edits.",
        transform: (candidate) => candidate.trim(),
        required: "A slug is required.",
        validate: async (candidate) => {
          await runtime.delay(120);
          return /^[a-z][a-z0-9-]*$/u.test(candidate)
            ? undefined
            : "Use lowercase letters, digits, and hyphens.";
        },
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "masked",
    title: "Masked input",
    section: "Interactive APIs",
    description:
      "Secret entry whose raw value never reaches the terminal or this report.",
    run: async (runtime) => {
      const value = await requestMaskedText({
        label: "Access token",
        placeholder: "paste a throwaway value",
        hint: "Masked entry; the result reports length only.",
        required: "A value is required.",
      }, { io: runtime.io });
      runtime.print(
        `Result: masked string of ${
          segmentGraphemes(value).length
        } grapheme(s); value withheld.`,
      );
    },
  },
  {
    id: "confirm",
    title: "Confirmation",
    section: "Interactive APIs",
    description:
      "Boolean switch with custom labels and a non-default initial value.",
    run: async (runtime) => {
      const value = await requestConfirmation({
        label: "Enable preview features",
        initialValue: false,
        yesLabel: "Enable",
        noLabel: "Keep off",
        hint: "y/n answers; arrows and hjkl flip it.",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "select",
    title: "Single selection",
    section: "Interactive APIs",
    description:
      "Flat select with duplicate visible labels, a disabled entry, and an initial highlight.",
    run: async (runtime) => {
      const value = await requestSelection({
        label: "Accent swatch",
        choices: swatchChoices,
        initialId: "citrine",
        hint: "Duplicate labels; one disabled entry.",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "select-grouped",
    title: "Grouped single selection",
    section: "Interactive APIs",
    description:
      "Semantic group headings, a disabled entry, and a validator that rejects one role.",
    run: async (runtime) => {
      const value = await requestSelection({
        label: "Semantic role",
        choices: tokenRoleChoices,
        hint: "Submit Accent to see validation fail.",
        validate: (candidate) =>
          candidate === "accent"
            ? "Accent is rejected here so validation failure stays reviewable."
            : undefined,
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "browse-documents",
    title: "Document browsing presentation",
    section: "Interactive APIs",
    description:
      "Titles lead, paths recede, path queries retain their group, and the completed picker clears before its result prints.",
    run: async (runtime) => {
      const value = await requestSearch({
        label: "Browse documents",
        search: documentChoices,
        initialId: "design-principles",
        placeholder: "Type a title or path",
        hint: "Try design-principles.md; Enter opens the highlighted path.",
        presentation: "browsing",
        completion: "clear-frame",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "markdown-browser",
    title: "Markdown browser links and mouse",
    section: "Interactive APIs",
    description:
      "A keyboard-complete adaptive reader follows fragments and admitted documents, optionally tracks pointer input, and returns external actions only after restoration.",
    run: async (runtime) => {
      let result: MarkdownBrowserResult<string>;
      try {
        result = await requestMarkdownBrowser({
          label: "Documentation library",
          placeholder: "Search titles, descriptions, and paths",
          entries: markdownBrowserEntries,
          mouse: true,
          resolveLink({ sourceDocumentId, destination }) {
            return sourceDocumentId === "getting-started" &&
                destination === "testing.md#fake-terminal"
              ? {
                kind: "document",
                documentId: "testing",
                fragment: "fake-terminal",
              }
              : {
                kind: "unresolved",
                message: "The playground corpus does not admit that document.",
              };
          },
        }, { io: runtime.io });
      } catch (error) {
        if (error instanceof MarkdownBrowserRefusalError) {
          runtime.print(
            `Result: Markdown browser refused ${error.columns}×${error.rows} (${error.reason}); no frame was drawn.`,
          );
          return;
        }
        throw error;
      }
      report(runtime, result);
      if (result.kind === "action" || result.kind === "external-link") {
        runtime.print(
          "Caller effect point: the terminal is restored; this playground deliberately opens nothing.",
        );
      }
    },
  },
  {
    id: "multiselect",
    title: "Multiselection",
    section: "Interactive APIs",
    description: "Flat multiselect with an initial selection and toggle-all.",
    run: async (runtime) => {
      const values = await requestSelections({
        label: "Spacing steps",
        choices: spacingChoices,
        initialIds: ["space-2", "space-4"],
        hint: "Space toggles one entry; Ctrl+A toggles all.",
      }, { io: runtime.io });
      report(runtime, values);
    },
  },
  {
    id: "multiselect-grouped",
    title: "Grouped multiselection",
    section: "Interactive APIs",
    description:
      "Group headings between checkboxes; results return in caller order.",
    run: async (runtime) => {
      const values = await requestSelections({
        label: "Roles to audit",
        choices: tokenRoleChoices,
        hint: "Headings and disabled entries stay fixed.",
      }, { io: runtime.io });
      report(runtime, values);
    },
  },
  {
    id: "search",
    title: "Search",
    section: "Interactive APIs",
    description:
      "Asynchronous query-driven results that keep their group headings.",
    run: async (runtime) => {
      const value = await requestSearch({
        label: "Find a token",
        initialId: "typography-heading",
        placeholder: "Type to filter",
        hint: "Starts from the remembered Heading result.",
        search: async (query) => {
          await runtime.delay(60);
          return searchGroupedEntries(longGroupedChoices, query);
        },
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "search-multiselect",
    title: "Query-filtered multiselection",
    section: "Interactive APIs",
    description:
      "A slow, debounced provider behind Tab-toggled multiselection; entries the query excludes stay selected in a retained band.",
    run: async (runtime) => {
      const values = await requestSearchSelections({
        label: "Roles to audit",
        placeholder: "Type to filter",
        hint: "Tab toggles; Ctrl+A toggles the current matches.",
        debounceMs: 150,
        search: async (query) => {
          await runtime.delay(400);
          return searchGroupedEntries(longGroupedChoices, query);
        },
      }, { io: runtime.io });
      report(runtime, values);
    },
  },
  {
    id: "autocomplete",
    title: "Autocomplete",
    section: "Interactive APIs",
    description: "Inline ghost completion over token names.",
    run: async (runtime) => {
      const value = await requestAutocomplete({
        label: "Token reference",
        suggestions: tokenNameSuggestions,
        placeholder: "canvas",
        hint: "Tab accepts the ghost; Up/Down cycles.",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "textarea",
    title: "Textarea",
    section: "Interactive APIs",
    description: "Multiline grapheme-aware editing submitted with Ctrl+D.",
    run: async (runtime) => {
      const value = await requestTextarea({
        label: "Release note",
        rows: 10,
        initialValue: "Added a terminal playground.\nNothing else changed.",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  {
    id: "acknowledge",
    title: "Acknowledgement",
    section: "Interactive APIs",
    description:
      "The smallest request: a message acknowledged with Enter or Space; Escape dismisses it.",
    run: async (runtime) => {
      await requestAcknowledgement({
        label: "Release note",
        message:
          "The playground restores your terminal after every journey, including cancelled ones.",
        hint: "Press Enter or Space to continue.",
      }, { io: runtime.io });
      runtime.print("Result: acknowledged (void).");
    },
  },
  {
    id: "acknowledge-compact",
    title: "Compact acknowledgement",
    section: "Interactive APIs",
    description:
      "One continuation hint below caller-owned output; Enter or Space clears it before returning.",
    run: async (runtime) => {
      runtime.print("Caller-owned document content ends here.");
      await requestAcknowledgement({ presentation: "compact" }, {
        io: runtime.io,
      });
      runtime.print("Result: compact acknowledgement cleared.");
    },
  },
  {
    id: "form",
    title: "Sequential form",
    section: "Interactive APIs",
    description:
      "Conditional steps, retained answers, summaries, and Ctrl+U back-navigation.",
    run: async (runtime) => {
      runtime.print("Ctrl+U returns to the previous applicable step.");
      const values = await createSequentialForm({
        label: "Component proposal",
        io: runtime.io,
      })
        .add({
          id: "name",
          label: "Name",
          run: (_values, previous, formRuntime) =>
            requestText({
              label: "Component name",
              initialValue: typeof previous === "string" ? previous : "",
              required: "A component name is required.",
            }, formRuntime),
          summarize: (value) => String(value),
        })
        .add({
          id: "terminal",
          label: "Terminal stance",
          run: (_values, previous, formRuntime) =>
            requestConfirmation({
              label: "Render in terminals?",
              initialValue: typeof previous === "boolean" ? previous : true,
            }, formRuntime),
          summarize: (value) => value === true ? "Rendered" : "Exempt",
        })
        .add({
          id: "reason",
          label: "Exemption reason",
          when: (answers) => answers.terminal === false,
          run: (_values, previous, formRuntime) =>
            requestText({
              label: "Exemption reason",
              initialValue: typeof previous === "string" ? previous : "",
              required: "Exempt stances record a reason.",
            }, formRuntime),
          summarize: (value) => String(value),
        })
        .add({
          id: "confirmed",
          label: "Confirm",
          run: (_values, previous, formRuntime) =>
            requestConfirmation({
              label: "Submit proposal?",
              initialValue: typeof previous === "boolean" ? previous : true,
            }, formRuntime),
          summarize: (value) => value === true ? "Yes" : "No",
        })
        .submit();
      report(runtime, values);
    },
  },
  {
    id: "spinner",
    title: "Spinner activity",
    section: "Interactive APIs",
    description:
      "Indeterminate motif spinner around a short operation, then its result.",
    run: async (runtime) => {
      const value = await withSpinner({
        label: "Working through the motif cycle",
        hint: "Runs about two seconds — long enough to watch the full cycle.",
        io: runtime.io,
        ...(runtime.spinnerScheduler === undefined
          ? {}
          : { scheduler: runtime.spinnerScheduler }),
      }, async () => {
        await runtime.delay(2000);
        return "woven";
      });
      report(runtime, value);
    },
  },
  {
    id: "progress",
    title: "Determinate progress",
    section: "Interactive APIs",
    description:
      "Truthful unit-by-unit progress naming each unit through advance() and set(), ending complete.",
    run: async (runtime) => {
      const value = await withDeterminateProgress({
        label: "Auditing 8 fixtures",
        total: 8,
        io: runtime.io,
      }, async (progress) => {
        for (let unit = 0; unit < 6; unit += 1) {
          await runtime.delay(180);
          progress.advance(1, `fixture ${unit + 1}`);
        }
        await runtime.delay(180);
        progress.set(7, "fixture 7");
        await runtime.delay(180);
        progress.relabel("Auditing 8 fixtures");
        return "audited";
      });
      report(runtime, value);
    },
  },
  {
    id: "activity-log",
    title: "Live activity log",
    section: "Interactive APIs",
    description:
      "Simulated multi-step run: pinned results above a bounded streaming tail with in-place partial updates, then a second run collapsing to one result line.",
    run: async (runtime) => {
      const steps = [
        { name: "Scaffold fixtures", tone: "success" },
        { name: "Compile styles", tone: "success" },
        { name: "Audit contrast", tone: "warning" },
      ] as const;
      const value = await withActivityLog({
        label: "Simulated three-step run",
        hint: "Results pin above the tail; Ctrl+C interrupts.",
        tailRows: 5,
        io: runtime.io,
        ...(runtime.spinnerScheduler === undefined
          ? {}
          : { scheduler: runtime.spinnerScheduler }),
      }, async (log) => {
        for (const [index, step] of steps.entries()) {
          log.relabel(`Step ${index + 1} of ${steps.length}: ${step.name}`);
          for (let unit = 1; unit <= 4; unit += 1) {
            for (let percent = 25; percent <= 100; percent += 25) {
              log.updatePartial(
                `${step.name.toLowerCase()} unit ${unit} at ${percent}%`,
              );
              await runtime.delay(60);
            }
            log.append(`${step.name.toLowerCase()} unit ${unit} finished`);
          }
          log.pin(
            step.tone === "warning"
              ? `${step.name} kept one warning`
              : `${step.name} held`,
            step.tone,
          );
        }
        log.finish({ mode: "summary" });
        return "three steps summarised";
      });
      report(runtime, value);
      const collapsed = await withActivityLog({
        label: "Compact follow-up run",
        tailRows: 3,
        io: runtime.io,
        ...(runtime.spinnerScheduler === undefined
          ? {}
          : { scheduler: runtime.spinnerScheduler }),
      }, async (log) => {
        for (let unit = 1; unit <= 6; unit += 1) {
          log.append(`follow-up detail line ${unit}`);
          await runtime.delay(120);
        }
        log.finish({
          mode: "result",
          tone: "success",
          text: "Follow-up collapsed to this single line",
        });
        return "collapsed";
      });
      report(runtime, collapsed);
    },
  },
  {
    id: "background",
    title: "Terminal background sensing",
    section: "Interactive APIs",
    description:
      "Sense the terminal ground — light, dark, or unknown — and print the typed evidence.",
    run: async (runtime) => {
      const reading = await senseTerminalBackground({
        io: runtime.io,
        environment: colorfgbgSnapshot(),
      });
      runtime.print(`Ground: ${reading.ground}`);
      const evidence = reading.evidence;
      if (evidence.source === "terminal-report") {
        runtime.print(
          `Evidence: terminal report ${
            JSON.stringify(evidence.report)
          } -> rgb(${evidence.color.red}, ${evidence.color.green}, ${evidence.color.blue})`,
        );
      } else if (evidence.source === "environment-hint") {
        runtime.print(`Evidence: COLORFGBG=${evidence.value}`);
      } else {
        runtime.print(`Evidence: none (${evidence.reason})`);
      }
      runtime.print(
        "Selection stays yours: light -> terminalThemes.light, dark -> terminalThemes.dark, unknown -> your product default.",
      );
    },
  },
];

const staticCatalogueJourneys: readonly PlaygroundJourney[] = [
  {
    id: "heading-variants",
    title: "Heading treatments",
    section: "Static catalogue",
    description:
      "Review the settled embedded, underline, and sandwich section boundaries.",
    run: runHeadingVariantsJourney,
  },
  {
    id: "motif-statuses",
    title: "Timeline and stepper statuses",
    section: "Static catalogue",
    description:
      "Review semantic status glyphs beside spinner, dot, bang, and cross markers.",
    run: (runtime) => {
      const capabilities = runtime.io.capabilities();
      runtime.print("Workflow stepper:");
      runtime.print(renderMotifWorkflowStepper([
        { label: "Completed", status: "complete" },
        { label: "Active", status: "active", phase: 1 },
        { label: "Pending", status: "pending" },
        { label: "Error", status: "error" },
        { label: "Cancelled", status: "cancelled" },
      ], capabilities));
      runtime.print("Timeline:");
      runtime.print(renderTimelineCli({
        title: "Status direction",
        items: [
          {
            date: "Done",
            title: "Complete",
            description: "Completed points up.",
            status: "complete",
          },
          {
            date: "Now",
            title: "Current",
            description: "Incomplete points down.",
            status: "current",
          },
          {
            date: "Next",
            title: "Upcoming",
            description: "Upcoming remains incomplete.",
            status: "upcoming",
          },
        ],
      }, capabilities));
      return Promise.resolve();
    },
  },
  {
    id: "browse",
    title: "Browse the static catalogue",
    section: "Static catalogue",
    description:
      "Walk Groups, Components, and named examples from the generated registry.",
    run: runBrowseJourney,
  },
  {
    id: "exemptions",
    title: "Recorded exemptions",
    section: "Static catalogue",
    description: "Print every exempt Component with its recorded reason.",
    run: (runtime) => {
      runtime.print("");
      runtime.print(renderCliExemptions());
      return Promise.resolve();
    },
  },
  {
    id: "motifs",
    title: "Terminal motif sheet",
    section: "Static catalogue",
    description:
      "Print the complete default and consumer-defined motif specimens at the current width.",
    run: (runtime) => {
      const motifSheet = terminalFoundationSheet("motifs");
      if (motifSheet === undefined) {
        throw new TypeError("Terminal motif foundation is not enrolled");
      }
      runtime.print("");
      runtime.print(
        renderTerminalFoundationSheet(motifSheet, runtime.io.capabilities()),
      );
      return Promise.resolve();
    },
  },
];

const stressJourneys: readonly PlaygroundJourney[] = [
  {
    id: "stress-long-grouped",
    title: "Long grouped list",
    section: "Stress & lifecycle",
    description:
      "26 selectable entries in four headed groups, with a duplicate label and a disabled entry.",
    run: async (runtime) => {
      const value = await requestSelection({
        label: "Long grouped list",
        choices: longGroupedChoices,
        hint: "Headings travel with their choices.",
      }, { io: runtime.io });
      report(runtime, value);
    },
  },
  visibleCountJourney(
    "stress-visible-3",
    "Three visible rows",
    "The long grouped list constrained to three visible rows.",
    3,
  ),
  visibleCountJourney(
    "stress-visible-default",
    "Package-default visible rows",
    "The long grouped list at the package's default visible count.",
    undefined,
  ),
  visibleCountJourney(
    "stress-visible-16",
    "Sixteen visible rows",
    "The long grouped list requesting sixteen visible rows.",
    16,
  ),
  {
    id: "stress-labels",
    title: "Label and grapheme stress",
    section: "Stress & lifecycle",
    description:
      "Flag and modifier clusters, combining marks, wide CJK, duplicate labels, and very long labels.",
    run: async (runtime) => {
      runtime.print(
        "Note: ZWJ-joined emoji are rejected by interaction label validation (format characters); flag pairs, modifier clusters, and combining marks are within the accepted repertoire.",
      );
      const single = await requestSelection({
        label: "Grapheme and width stress",
        choices: unicodeStressChoices,
      }, { io: runtime.io });
      report(runtime, single);
      const multiple = await requestSelections({
        label: "Toggle wide and duplicate labels",
        choices: unicodeStressChoices,
      }, { io: runtime.io });
      report(runtime, multiple);
    },
  },
  {
    id: "stress-reopen-loop",
    title: "Repeated selection loop",
    section: "Stress & lifecycle",
    description:
      "Repeatedly open, navigate, submit or cancel, and reopen 16-row search and select interactions — the reported progressive-height case.",
    run: async (runtime) => {
      const { io, print } = runtime;
      let pass = 0;
      while (true) {
        pass += 1;
        print("");
        print(`Pass ${pass} — ${renderTerminalFacts(io)}`);
        try {
          const found = await requestSearch({
            label: `Search (pass ${pass}, 16 visible rows)`,
            visibleCount: 16,
            hint: "Navigate deep, submit or cancel, then reopen.",
            search: (query) => searchGroupedEntries(longGroupedChoices, query),
          }, { io });
          report(runtime, found);
        } catch (error) {
          if (!(error instanceof InteractionCancelled)) throw error;
          print(`Search cancelled (${error.reason}); the loop continues.`);
        }
        try {
          const picked = await requestSelection({
            label: `Select (pass ${pass}, 16 visible rows)`,
            visibleCount: 16,
            choices: longGroupedChoices,
          }, { io });
          report(runtime, picked);
        } catch (error) {
          if (!(error instanceof InteractionCancelled)) throw error;
          print(`Select cancelled (${error.reason}); the loop continues.`);
        }
        const again = await requestConfirmation({
          label: "Run another pass",
          initialValue: true,
          hint: "Each pass should keep the full viewport.",
        }, { io });
        if (again !== true) return;
      }
    },
  },
  {
    id: "stress-resize",
    title: "Resize while active",
    section: "Stress & lifecycle",
    description:
      "Keep a long interaction open while resizing the terminal, then compare facts.",
    run: async (runtime) => {
      const { io, print } = runtime;
      print(
        "Resize the terminal while the interaction is open, then navigate.",
      );
      const value = await requestSelection({
        label: "Resize while active",
        choices: longGroupedChoices,
        visibleCount: 10,
      }, { io });
      report(runtime, value);
      print(`After the interaction — ${renderTerminalFacts(io)}`);
    },
  },
  {
    id: "stress-viewport",
    title: "Width and height review",
    section: "Stress & lifecycle",
    description:
      "Full-width rule plus a tall interaction; rerun in narrow, wide, short, and tall terminals.",
    run: async (runtime) => {
      const { io, print } = runtime;
      const capabilities = io.capabilities();
      print("Width probe at the full current column count:");
      print(
        renderMotifPattern({ length: capabilities.columns }, capabilities),
      );
      print(
        "Rerun this journey in narrow (~40), ordinary (~80), and very wide (160+) terminals, and in limited-height and generous-height windows.",
      );
      const value = await requestSelection({
        label: "Height probe (16 visible rows)",
        choices: longGroupedChoices,
        visibleCount: 16,
      }, { io });
      report(runtime, value);
    },
  },
  {
    id: "interrupt-cancel",
    title: "Interrupt with caller cancellation",
    section: "Stress & lifecycle",
    description:
      "Ctrl+C mid-activity reaches onInterrupt: the frame ends truthfully, the cursor returns, and the playground continues.",
    run: async (runtime) => {
      runtime.print(
        "Press Ctrl+C while each activity runs — onInterrupt cancels the operation and the session survives. Waiting completes normally.",
      );
      let interruptSpinner: () => void = () => {};
      const spinnerInterrupted = new Promise<never>((_, reject) => {
        interruptSpinner = () =>
          reject(new InteractionCancelled("Interrupted."));
      });
      try {
        const value = await withSpinner({
          label: "Interruptible weave",
          hint: "Ctrl+C cancels through onInterrupt.",
          io: runtime.io,
          onInterrupt: () => interruptSpinner(),
          ...(runtime.spinnerScheduler === undefined
            ? {}
            : { scheduler: runtime.spinnerScheduler }),
        }, () =>
          Promise.race([
            runtime.delay(6000).then(() => "completed without interruption"),
            spinnerInterrupted,
          ]));
        report(runtime, value);
      } catch (error) {
        if (!(error instanceof InteractionCancelled)) throw error;
        runtime.print(
          `Spinner interrupted (${error.reason}) — frame cleared, cursor restored.`,
        );
      }
      let interruptProgress: () => void = () => {};
      const progressInterrupted = new Promise<never>((_, reject) => {
        interruptProgress = () =>
          reject(new InteractionCancelled("Interrupted."));
      });
      try {
        const value = await withDeterminateProgress({
          label: "Interruptible units",
          total: 6,
          io: runtime.io,
          onInterrupt: () => interruptProgress(),
        }, async (progress) => {
          for (let unit = 1; unit <= 6; unit += 1) {
            await Promise.race([runtime.delay(600), progressInterrupted]);
            progress.advance(1, `unit ${unit}`);
          }
          return "all units complete";
        });
        report(runtime, value);
      } catch (error) {
        if (!(error instanceof InteractionCancelled)) throw error;
        runtime.print(
          `Progress interrupted (${error.reason}) — incomplete frame cleared, cursor restored.`,
        );
      }
    },
  },
  {
    id: "interrupt-exit",
    title: "Interrupt with default exit",
    section: "Stress & lifecycle",
    description:
      "Ctrl+C mid-spinner restores the terminal, then the process exits as an interrupt — running it and interrupting ends the playground.",
    run: async (runtime) => {
      runtime.print(
        "Press Ctrl+C while the spinner runs: the frame clears, the cursor returns, and the playground exits by SIGINT with coherent scrollback. Waiting completes normally.",
      );
      const value = await withSpinner({
        label: "Default interrupt posture",
        hint: "Ctrl+C exits after restoration.",
        io: runtime.io,
        ...(runtime.spinnerScheduler === undefined
          ? {}
          : { scheduler: runtime.spinnerScheduler }),
      }, async () => {
        await runtime.delay(6000);
        return "completed without interruption";
      });
      report(runtime, value);
    },
  },
  degradedJourney(
    "stress-no-color",
    "NO_COLOR",
    "Colour suppressed while Unicode and cursor control remain available.",
    {
      NO_COLOR: "1",
      TERM: "xterm-256color",
      LANG: "en_GB.UTF-8",
    },
    "NO_COLOR=1 deno task playground:cli",
  ),
  {
    id: "activity-log-degraded",
    title: "Activity log append-only degradation",
    section: "Stress & lifecycle",
    description:
      "The same producer feed under TERM=dumb: no live frame, committed lines once each behind the rail, stable lines when pinned, no partial churn.",
    run: async (runtime) => {
      const environment = { TERM: "dumb", LANG: "C.UTF-8" } as const;
      const synthetic = detectTerminalCapabilities({
        env: environment,
        isTty: true,
        columns: runtime.io.size().columns,
      });
      runtime.print(`Synthetic detection: ${describeCapabilities(synthetic)}`);
      const degraded = runtime.degradedIo(environment);
      const value = await withActivityLog({
        label: "Simulated run without live repaint",
        tailRows: 4,
        io: degraded,
      }, async (log) => {
        log.updatePartial("partial churn never prints here");
        await runtime.delay(150);
        log.append("first committed line");
        log.updatePartial("half-finished detail");
        await runtime.delay(150);
        log.append("second committed line");
        log.pin("Both units held", "success");
        log.updatePartial("uncommitted at finish, flushed once");
        await runtime.delay(150);
        log.finish();
        return "append-only feed complete";
      });
      report(runtime, value);
      runtime.print(
        "Relaunch fully degraded: TERM=dumb LANG=C.UTF-8 deno task playground:cli",
      );
    },
  },
  degradedJourney(
    "stress-term-dumb",
    "TERM=dumb with UTF-8",
    "Unicode glyphs retained under TERM=dumb; colour and live repaint disabled, so frames emit statically.",
    {
      TERM: "dumb",
      LANG: "C.UTF-8",
    },
    "TERM=dumb LANG=C.UTF-8 deno task playground:cli",
  ),
  degradedJourney(
    "stress-ascii",
    "Exact C/POSIX ASCII",
    "Exact C locale degrades geometry to ASCII while colour depth follows TERM.",
    {
      LC_ALL: "C",
      TERM: "xterm-256color",
    },
    "LC_ALL=C deno task playground:cli",
  ),
];

/** Complete journey inventory in recommended review order. */
export const playgroundJourneys: readonly PlaygroundJourney[] = [
  ...interactiveApiJourneys,
  ...staticCatalogueJourneys,
  ...stressJourneys,
];

const journeyIndex = new Map(
  playgroundJourneys.map((journey) => [journey.id, journey]),
);

/** Look one journey up by its stable ID. */
export function journeyById(id: string): PlaygroundJourney | undefined {
  return journeyIndex.get(id);
}

/**
 * Run one journey inside the shared review boundary: a titled section rule,
 * the reproducibility banner, and the only cancellation catch — the
 * package's public `InteractionCancelled`. Anything else propagates after the
 * package has restored the terminal.
 */
export async function runJourney(
  journey: PlaygroundJourney,
  runtime: PlaygroundRuntime,
): Promise<"completed" | "cancelled"> {
  const capabilities = runtime.io.capabilities();
  runtime.print("");
  runtime.print(journeyHeading(journey.title, capabilities));
  runtime.print(`[${journey.id}] ${journey.description}`);
  runtime.print(renderTerminalFacts(runtime.io));
  try {
    await journey.run(runtime);
  } catch (error) {
    if (error instanceof InteractionCancelled) {
      runtime.print(
        `Journey cancelled (${error.reason}) — terminal restored.`,
      );
      return "cancelled";
    }
    throw error;
  }
  runtime.print(`Journey ${journey.id} complete.`);
  return "completed";
}

/**
 * Journey-or-reason classification for every runtime export of
 * `./cli/interactive`. The playground test enumerates the adapter's real
 * exports against this map, so a newly exported high-level API fails the
 * suite until it either gains a journey or records why it needs none.
 */
export const interactiveExportCoverage: Readonly<
  Record<
    string,
    { readonly journey: string } | { readonly excluded: string }
  >
> = {
  requestAcknowledgement: { journey: "acknowledge" },
  requestText: { journey: "text" },
  requestMaskedText: { journey: "masked" },
  requestConfirmation: { journey: "confirm" },
  requestSelection: { journey: "select" },
  requestSelections: { journey: "multiselect" },
  requestSearch: { journey: "search" },
  requestSearchSelections: { journey: "search-multiselect" },
  requestAutocomplete: { journey: "autocomplete" },
  requestMarkdownBrowser: { journey: "markdown-browser" },
  requestTextarea: { journey: "textarea" },
  createSequentialForm: { journey: "form" },
  withSpinner: { journey: "spinner" },
  withDeterminateProgress: { journey: "progress" },
  withActivityLog: { journey: "activity-log" },
  senseTerminalBackground: { journey: "background" },
  createMarkdownBrowserState: {
    excluded:
      "Pure state construction exercised by the Markdown browser journey and Catalogue inspector.",
  },
  filterMarkdownBrowserEntries: {
    excluded:
      "Pure grouped matcher exercised inside the Markdown browser journey.",
  },
  markdownBrowserResumableState: {
    excluded:
      "Pure stable-state projection returned by the Markdown browser journey.",
  },
  transitionMarkdownBrowser: {
    excluded:
      "Pure semantic transition authority driven through requestMarkdownBrowser.",
  },
  renderMarkdownBrowser: {
    excluded:
      "Pure complete-frame renderer shown by the Catalogue inspector and driven by requestMarkdownBrowser.",
  },
  MarkdownBrowserRefusalError: {
    excluded:
      "Typed capability and geometry refusal; the journey entry reports it when the live terminal cannot begin safely.",
  },
  denoTerminalSignals: {
    excluded:
      "Process SIGINT source installed by default inside every lifecycle bracket; the interrupt journeys exercise it live.",
  },
  signalPassthrough: {
    excluded:
      "Options plumbing that forwards a caller's SIGINT posture; it has no interactive surface of its own.",
  },
  SequentialFormBuilder: {
    excluded:
      "Constructed through createSequentialForm; the form journey exercises it.",
  },
  InteractionCancelled: {
    excluded:
      "Public cancellation outcome; the journey wrapper catches it on every run.",
  },
  InteractionFrameCleanupError: {
    excluded:
      "Typed clear-frame refusal; the compact acknowledgement and document-browsing journeys exercise successful cleanup.",
  },
  NonInteractiveTerminalError: {
    excluded:
      "Refusal signal; the playground entry reports it for non-TTY runs.",
  },
  DenoTerminalIO: {
    excluded:
      "The terminal implementation every real playground session runs through.",
  },
  GraphemeTextEditor: {
    excluded:
      "Editing engine driven inside every editing interaction; it has no separate interactive surface.",
  },
  segmentGraphemes: {
    excluded:
      "Pure text segmentation; journeys use it to report lengths without echoing masked values.",
  },
  tokenizeTerminalKeys: {
    excluded:
      "Key decoding runs inside every interaction; the playground must not decode keys itself.",
  },
  BufferedTerminalKeyDecoder: {
    excluded:
      "Key decoding runs inside every interaction; the playground must not decode keys itself.",
  },
  TerminalKeyReader: {
    excluded:
      "Key decoding runs inside every interaction; the playground must not decode keys itself.",
  },
  TERMINAL_MOUSE_MAX_COORDINATE: {
    excluded:
      "Decoder safety bound exercised through the Markdown browser's typed mouse journey and published test helpers.",
  },
  decodeTerminalInputEvent: {
    excluded:
      "Semantic mouse classification runs inside the Markdown browser; the playground must not decode controls itself.",
  },
  TerminalInputReader: {
    excluded:
      "Event decoding runs inside the mouse-enabled Markdown browser journey.",
  },
  isNamedKey: {
    excluded:
      "Key predicate for interaction machines; no interactive surface of its own.",
  },
  filterInteractionEntries: {
    excluded:
      "Pure static choice matcher exercised by the document-browsing journey's title and path source.",
  },
  HIDE_TERMINAL_CURSOR: {
    excluded:
      "Cursor-control constant owned by the package lifecycle brackets.",
  },
  SHOW_TERMINAL_CURSOR: {
    excluded:
      "Cursor-control constant owned by the package lifecycle brackets.",
  },
  assertInteractiveTerminal: {
    excluded:
      "Interactivity guard; the playground entry calls it before any terminal mutation.",
  },
  withHiddenTerminalCursor: {
    excluded:
      "Lifecycle bracket already wrapped around every interaction and activity run.",
  },
  withRawTerminal: {
    excluded: "Lifecycle bracket already wrapped around every interaction run.",
  },
  InlineFramePainter: {
    excluded:
      "Repaint control consumed by package interactions; its refusals surface through the viewport and degradation journeys.",
  },
};
