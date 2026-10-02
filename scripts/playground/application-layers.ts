/** Sample layers for the generic terminal application: a sheet, a menu, a palette, a form, and readers. */
import { TERMINAL_GLYPHS } from "@discern-sh/design-system/cli";
import type {
  ApplicationActivity,
  ApplicationDetailBlock,
  ApplicationForm,
  ApplicationGlyph,
  ApplicationMenu,
  ApplicationPalette,
  ApplicationReader,
  ApplicationRun,
  ApplicationSheet,
  ApplicationSheetState,
} from "@discern-sh/design-system/cli/interactive";
import type { DemoJob } from "./application.ts";

const mark = (
  glyph: keyof typeof TERMINAL_GLYPHS,
  tone?: ApplicationGlyph["tone"],
): ApplicationGlyph => ({
  unicode: TERMINAL_GLYPHS[glyph].unicode,
  ascii: TERMINAL_GLYPHS[glyph].ascii,
  ...(tone === undefined ? {} : { tone }),
});

const marks = (
  items: readonly (readonly [ApplicationGlyph, readonly ApplicationRun[]])[],
): ApplicationDetailBlock => ({
  kind: "marks",
  items: items.map(([glyph, runs]) => ({ mark: glyph, runs })),
});

/** One of the sample's commands: the key that runs it, its name, and what it does. */
export interface DemoCommand {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

/**
 * The commands the sample binds, in the order it lists them: the keys
 * reader's Act section and the pinned Commands row both read this list.
 */
export const DEMO_COMMANDS: readonly DemoCommand[] = [
  { key: "ctrl-k", label: "Commands", description: "Search jobs and commands" },
  { key: ".", label: "Actions", description: "Act on the selected job" },
  { key: "n", label: "New job…", description: "Start one from a template" },
  { key: "/", label: "Filter", description: "Narrow the list as you type" },
  { key: "g", label: "Guide", description: "Read how the sample works" },
  { key: "?", label: "Keys", description: "Every key in one place" },
  { key: "q", label: "Quit", description: "Leave the sample" },
];

/** A slug for a job, used as its folder and its command target. */
export function demoSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(
    /^-|-$/gu,
    "",
  );
}

/** Numbered steps; a digit is a one-cell mark. */
const stepsBlock = (
  steps: readonly string[],
): readonly ApplicationDetailBlock[] => [
  marks(steps.map((step, index) => {
    const digit = String(index + 1);
    return [{ unicode: digit, ascii: digit, tone: "faint" }, [{ text: step }]];
  })),
];

const commandBlock = (command: string): readonly ApplicationDetailBlock[] => [{
  kind: "text",
  runs: [{ text: command, role: "code" }],
}];

/** How far a sample run has got, for its progress sheet. */
export interface DemoRunProgress {
  readonly startedAt: number;
  readonly now: number;
}

/**
 * The sheet that asks before running a job again: consequences first, two
 * disclosures, Keep focused. With `progress`, the same sheet shows the run's
 * steps with Hide as its safe choice.
 */
export function demoRunSheet(
  job: DemoJob,
  state: ApplicationSheetState = "ready",
  progress?: DemoRunProgress,
): ApplicationSheet<string> {
  const steps = [
    "Fetch the originals",
    "Resize every image",
    "Write the thumbnails",
    "Clear the scratch folder",
  ];
  const activity: ApplicationActivity | undefined = progress === undefined
    ? undefined
    : {
      startedAt: progress.startedAt,
      typicalMs: 60_000,
      typicalLabel: "usually about 1m",
      steps: steps.map((label, index) => {
        const started = progress.startedAt + index * 9_000;
        const ended = started + 9_000;
        return {
          id: `step-${index}`,
          label,
          state: progress.now >= ended
            ? "done" as const
            : progress.now >= started
            ? "active" as const
            : "pending" as const,
          ...(progress.now >= started ? { startedAt: started } : {}),
          ...(progress.now >= ended ? { endedAt: ended } : {}),
        };
      }),
      then: [[
        { text: "Nightly backup runs next" },
        { text: " · ", ascii: " - ", tone: "faint" },
        { text: "queued", tone: "muted" },
      ]],
    };
  return {
    kind: "sheet",
    id: "run",
    scope: "item",
    title: progress === undefined
      ? `Run ${job.title} again?`
      : `Running ${job.title}`,
    state,
    busy: "Checking the source folder…",
    body: [
      marks([
        [mark("done", "success"), [{
          text: "Its source folder is readable again",
        }]],
        [mark("changes", "muted"), [
          { text: "Processes 48 images · 4 steps  " },
          { text: "+48", tone: "success" },
          { text: " −48", ascii: " -48", tone: "danger" },
        ]],
        [mark("changes", "muted"), [{
          text: "Replaces the thumbnails in thumbnails/",
        }]],
        [mark("changes", "muted"), [{
          text: "Nightly backup waits until this run finishes",
        }]],
        [mark("removes", "muted"), [{ text: "Clears the scratch folder" }]],
        [mark("keeps", "muted"), [{
          text: "Keeps the originals and last week's output",
        }]],
      ]),
    ],
    disclosures: [
      {
        id: "steps",
        label: `Steps · ${steps.length}`,
        hint: "Steps",
        key: "d",
        content: stepsBlock(steps),
      },
      {
        id: "command",
        label: "Command",
        key: "c",
        content: commandBlock(`jobs run ${job.id}`),
      },
    ],
    ...(progress === undefined
      ? { footnote: [{ text: "Nothing runs until you choose Run." }] }
      : {}),
    readHint: "to read before running",
    buttons: progress === undefined
      ? [
        { id: "keep", label: "Keep", role: "safe" },
        {
          id: "run",
          label: "Run",
          role: "confirm",
          action: `confirm-run:${job.id}`,
        },
      ]
      : [
        { id: "hide", label: "Hide", role: "safe" },
        {
          id: "stop",
          label: "Stop",
          role: "destructive",
          action: `stop:${job.id}`,
        },
      ],
    ...(activity === undefined ? {} : { activity }),
  };
}

/**
 * The sheet that asks before deleting a job: a typed challenge, the plan and
 * command one chord away from the field, and a pause alternative.
 */
export function demoDeleteSheet(job: DemoJob): ApplicationSheet<string> {
  const slug = demoSlug(job.title);
  return {
    kind: "sheet",
    id: "delete",
    scope: "item",
    title: `Delete ${job.title}?`,
    state: "ready",
    body: [
      marks([
        [mark("removes", "danger"), [{
          text: "Discards 12 albums queued for import",
          tone: "danger",
        }]],
        [mark("removes", "muted"), [{
          text: "Removes its schedule, settings and history",
        }]],
        [mark("restorable", "muted"), [{
          text:
            "Its last output is kept for a while; the steps show how to restore it",
        }]],
      ]),
    ],
    challenge: {
      fieldId: "confirm",
      label: [
        { text: "Type " },
        { text: slug, role: "title" },
        { text: " to delete it" },
      ],
      mustEqual: slug,
    },
    disclosures: [
      {
        id: "steps",
        label: "Steps · 3",
        hint: "Steps",
        key: "d",
        fieldKey: "ctrl-t",
        content: stepsBlock([
          "Stop its schedule",
          "Move its outputs to the archive",
          "Delete its settings",
        ]),
      },
      {
        id: "command",
        label: "Command",
        key: "c",
        fieldKey: "ctrl-x",
        content: commandBlock(`jobs delete ${job.id}`),
      },
    ],
    footnote: [{ text: "Nothing changes until you choose Delete." }],
    buttons: [
      {
        id: "pause",
        label: "Pause instead",
        role: "alternative",
        key: "p",
        action: `pause:${job.id}`,
      },
      { id: "keep", label: "Keep", role: "safe" },
      {
        id: "delete",
        label: "Delete",
        role: "destructive",
        requiresChallenge: true,
        action: `confirm-delete:${job.id}`,
      },
    ],
  };
}

/** Every action a job offers, in two columns, with the ones that cannot run now folded. */
export function demoActionsMenu(job: DemoJob): ApplicationMenu<string> {
  const describe = (text: string): readonly ApplicationRun[] => [{ text }];
  return {
    kind: "menu",
    id: "actions",
    scope: "item",
    title: job.title,
    aside: [{ text: "Actions · 6 of 8 available" }],
    columns: 2,
    lettersActivate: true,
    initialItemId: "run",
    sections: [
      {
        title: "Run",
        items: [
          {
            id: "run",
            label: "Run again…",
            key: "r",
            action: `rerun:${job.id}`,
            description: describe("Review, then run every step again."),
          },
          {
            id: "log",
            label: "Open the log",
            key: "l",
            action: `log:${job.id}`,
            description: describe("Read each run's steps and outputs."),
          },
          {
            id: "folder",
            label: "Open the folder",
            key: "o",
            action: `run:${job.id}`,
            description: describe("Hand the terminal to a shell there."),
          },
        ],
      },
      {
        title: "Schedule",
        unavailable: [{
          id: "calendar",
          label: "Add to calendar",
          sentence:
            "No calendar is connected: connect one in Settings, then add the job again.",
          reason: "no calendar",
        }],
        items: [
          {
            id: "schedule",
            label: "Change schedule…",
            key: "s",
            action: `schedule:${job.id}`,
            description: describe("Pick when it runs."),
          },
          {
            id: "pause",
            label: "Pause…",
            key: "p",
            action: `pause:${job.id}`,
            description: describe("Keep it, but stop running it."),
          },
        ],
      },
      {
        title: "Danger",
        items: [{
          id: "delete",
          label: "Delete…",
          key: "D",
          tone: "danger",
          action: `delete:${job.id}`,
          description: describe("Review, then remove it and its history."),
        }],
      },
    ],
    footnote: [{ text: "Changes apply from the next run." }],
    unavailable: {
      title: "Unavailable",
      items: [
        {
          id: "resume",
          label: "Resume",
          sentence: "Resume isn't available: the job is not paused.",
        },
        {
          id: "cancel",
          label: "Cancel the run",
          sentence: "Cancel isn't available: the job is not running.",
        },
      ],
    },
  };
}

/** Everything the screen can do, searchable. */
export function demoPalette(
  jobs: readonly DemoJob[],
  mouse: boolean,
): ApplicationPalette<string> {
  const toned = (job: DemoJob): readonly ApplicationRun[] => [{
    text: job.status,
    tone: job.tone === "faint" || job.tone === "accent" ? "muted" : job.tone,
  }];
  const needs = jobs.filter((job) =>
    job.group === "attention" || job.group === "review"
  );
  return {
    kind: "palette",
    id: "palette",
    scope: "global",
    placeholder: "Search jobs and commands",
    sections: [
      {
        title: "Needs you",
        items: needs.map((job) => ({
          id: `next-${job.id}`,
          label: job.group === "review" ? "Review output" : "Run again…",
          context: job.title,
          meta: toned(job),
          action: job.group === "review" ? `log:${job.id}` : `rerun:${job.id}`,
          keywords: job.status,
        })),
      },
      {
        title: "Go to",
        items: [
          {
            id: "log",
            label: "Activity log",
            meta: [{ text: "3 today", tone: "faint" }],
            action: "log:quarterly-report",
          },
          {
            id: "paused",
            label: "Paused jobs",
            meta: [{ text: "3 jobs", tone: "faint" }],
            key: "6",
            action: "paused",
          },
        ],
      },
      {
        title: "Create",
        items: [{ id: "new", label: "New job…", key: "n", action: "new" }],
      },
      {
        title: "Session",
        items: [
          {
            id: "mouse",
            label: mouse ? "Turn mouse off" : "Turn mouse on",
            meta: [{ text: mouse ? "on" : "off", tone: "faint" }],
            action: "mouse",
            keywords: "pointer click wheel",
          },
          {
            id: "keys",
            label: "Keyboard shortcuts",
            key: "?",
            action: "keys",
          },
        ],
      },
    ],
  };
}

/** The values a new-job form has typed so far. */
export interface DemoFormValues {
  readonly title: string;
  readonly schedule: string;
  readonly notes: string;
}

/** The new-job form: a title, folded options, and a live preview of what Create does. */
export function demoNewJobForm(
  values: DemoFormValues = { title: "", schedule: "daily", notes: "" },
): ApplicationForm<string> {
  const slug = demoSlug(values.title);
  const named = slug === "" ? "the new job" : slug;
  return {
    kind: "form",
    id: "new",
    scope: "global",
    title: "New job",
    aside: [{ text: "from a template" }],
    fields: [
      {
        kind: "text",
        id: "title",
        label: "Title",
        initial: "",
        required: true,
        hint: slug === ""
          ? [{ text: "Name it for what it produces", tone: "faint" }]
          : [{ text: "Folder ", tone: "faint" }, { text: slug }],
      },
      {
        kind: "group",
        id: "options",
        label: "More options",
        summary: `${values.schedule} · ${
          values.notes === "" ? "no notes" : "notes"
        } · default runner`,
        fields: [
          {
            kind: "choice",
            id: "schedule",
            label: "Runs",
            initial: "daily",
            options: [
              { id: "hourly", label: "Hourly" },
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
            ],
          },
          {
            kind: "text",
            id: "notes",
            label: "Notes",
            initial: "",
            multiline: true,
            editor: { key: "ctrl-o", action: "edit-notes", label: "Editor" },
          },
          {
            kind: "choice",
            id: "runner",
            label: "Runner",
            initial: "default",
            options: [
              { id: "default", label: "Default" },
              {
                id: "fast",
                label: "Fast",
                disabledReason: "No fast runners are free",
              },
            ],
          },
        ],
      },
    ],
    preview: [{
      kind: "section",
      title: "This will",
      blocks: [
        marks([
          [mark("changes", "muted"), [{ text: `Create ${named} in jobs/` }]],
          [mark("changes", "muted"), [{
            text: `Run it ${values.schedule}, starting tonight`,
          }]],
        ]),
      ],
    }],
    disclosures: [
      {
        id: "steps",
        label: "Steps · 3",
        hint: "Steps",
        key: "d",
        fieldKey: "ctrl-t",
        content: stepsBlock([
          "Copy the template",
          "Write the schedule",
          "Run a dry check",
        ]),
      },
      {
        id: "command",
        label: "Command",
        key: "c",
        fieldKey: "ctrl-x",
        content: commandBlock(`jobs new "${values.title}"`),
      },
    ],
    footnote: [{ text: "Nothing is created until you choose Create." }],
    buttons: [
      { id: "cancel", label: "Cancel", role: "safe" },
      { id: "create", label: "Create", role: "confirm", action: "create" },
      {
        id: "create-run",
        label: "Create and run",
        role: "confirm",
        action: "create-run",
      },
    ],
  };
}

/** A job's run log: a summary, then one focusable row per output. */
export function demoLogReader(job: DemoJob): ApplicationReader<string> {
  const file = (name: string, size: string, age: string) => ({
    id: name,
    title: name,
    marker: mark("idle", "faint"),
    cells: {
      size: [{ text: size, tone: "muted" as const }],
      age: [{ text: age, tone: "faint" as const }],
    },
    primary: `open:${name}`,
  });
  return {
    kind: "reader",
    id: "log",
    scope: "item",
    title: `${job.title} · log`,
    aside: [{ text: "3 runs today", tone: "faint" }],
    blocks: [
      {
        kind: "state",
        glyph: mark(job.glyph === TERMINAL_GLYPHS.failed ? "failed" : "done"),
        label: job.status,
        tone: job.tone,
        qualifier: job.age,
      },
      { kind: "text", runs: [{ text: job.explanation }] },
    ],
    rows: {
      id: "outputs",
      columns: [
        { id: "size", width: 8, align: "end" },
        { id: "age", width: 4, align: "end", priority: 1 },
      ],
      groups: [{
        id: "outputs",
        title: "Outputs",
        items: [
          file("summary.csv", "12 KB", "20m"),
          file("thumbnails/", "48 files", "20m"),
          file("errors.txt", "2 KB", "2h"),
          file("run.log", "31 KB", "2h"),
        ],
      }],
    },
    keys: [{ key: "o", label: "Open folder", action: `run:${job.id}` }],
  };
}

/** The keyboard shortcuts, as a reader. */
export function demoKeysReader(): ApplicationReader<string> {
  const keys = (
    items: readonly (readonly [string | readonly string[], string])[],
  ): ApplicationDetailBlock => ({
    kind: "hints",
    items: items.map(([key, label]) => ({ key, label })),
  });
  return {
    kind: "reader",
    id: "keys",
    scope: "global",
    title: "Keyboard shortcuts",
    columns: 2,
    footnote: [{ text: "Every key is listed in the footer too." }],
    blocks: [
      {
        kind: "section",
        title: "Move",
        blocks: [keys([
          [["up", "down"], "Move"],
          [["tab", "shift-tab"], "Next or previous group"],
          ["space", "Expand details"],
          [["page-up", "page-down"], "Scroll details"],
        ])],
      },
      {
        kind: "section",
        title: "Act",
        blocks: [keys([
          ["enter", "Run sample"],
          ...DEMO_COMMANDS.map(({ key, label }) => [key, label] as const),
        ])],
      },
      {
        kind: "section",
        title: "In a sheet",
        blocks: [keys([
          [["left", "right"], "Move between buttons"],
          ["escape", "The safe choice"],
          ["d", "Steps"],
          ["c", "Command"],
        ])],
      },
    ],
  };
}
