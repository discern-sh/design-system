/** Generic terminal application demonstration consuming only public package entrypoints. */
import {
  createCliBlock,
  renderMarkdownCli,
  TERMINAL_GLYPHS,
  type TerminalGlyph,
  type TerminalTextTone,
} from "@discern-sh/design-system/cli";
import type {
  ApplicationDetailBlock,
  ApplicationDetailMark,
  ApplicationDetailRow,
  ApplicationDetailStrip,
  ApplicationGlyph,
  ApplicationKeyBinding,
  ApplicationLayer,
  ApplicationListGroup,
  ApplicationListItem,
  ApplicationMessage,
  ApplicationRun,
  TerminalApplicationContext,
  TerminalApplicationOptions,
  TerminalApplicationView,
} from "@discern-sh/design-system/cli/interactive";
import {
  demoActionsMenu,
  demoDeleteSheet,
  type DemoFormValues,
  demoKeysReader,
  demoLogReader,
  demoNewJobForm,
  demoPalette,
  demoRunSheet,
} from "./application-layers.ts";

/** One sample job: what its row, detail, and strip show. */
export interface DemoJob {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly glyph: TerminalGlyph;
  readonly tone: TerminalTextTone;
  readonly status: string;
  readonly qualifier?: ApplicationRun;
  readonly age: string;
  readonly overlap?: string;
  readonly explanation: string;
  readonly facts: readonly (readonly [string, readonly ApplicationRun[]])[];
  readonly meter?: number;
  /** What went wrong in the last run, with the lines that belong to it. */
  readonly failure?: ApplicationDetailMark;
  /** Recent runs, newest first. */
  readonly runs?: readonly ApplicationDetailRow[];
}

const notes = createCliBlock(renderMarkdownCli, {
  source: `Outputs land in **reports/** and keep the last three runs.

Each run reads the previous quarter's ledger and writes one summary per team.`,
});

function run(id: string, summary: string, age: string): ApplicationDetailRow {
  return {
    lead: [{ text: id, tone: "faint" }],
    text: [{ text: summary }],
    cells: { age: [{ text: age, tone: "faint" }] },
  };
}

const paused = (title: string): DemoJob => ({
  id: title.toLowerCase().replaceAll(" ", "-"),
  title,
  group: "paused",
  glyph: TERMINAL_GLYPHS.paused,
  tone: "muted",
  status: "Paused",
  age: "5d",
  explanation: "Paused on purpose. Its schedule and outputs are kept.",
  facts: [["Paused", [{ text: "5 days ago" }]]],
});

/** The sample fleet, in group order. */
export const DEMO_JOBS: readonly DemoJob[] = [
  {
    id: "quarterly-report",
    title: "Quarterly report",
    group: "review",
    glyph: TERMINAL_GLYPHS.done,
    tone: "success",
    status: "Ready",
    age: "20m",
    explanation:
      "Finished 20m ago and nothing has changed since. Its outputs wait for a look before they are shared.",
    facts: [
      ["Last run", [{ text: "Passed 20m ago" }]],
      ["Output", [
        { text: "14 files  " },
        { text: "+212", tone: "success" },
        { text: " −18", ascii: " -18", tone: "danger" },
      ]],
      ["Schedule", [{ text: "Every Monday" }]],
      ["Owner", [{ text: "Reporting" }]],
    ],
    runs: [
      run("r-0412", "Weekly totals for every team", "20m"),
      run("r-0405", "Weekly totals, with the late ledger entries", "1w"),
      run("r-0329", "Weekly totals", "2w"),
    ],
  },
  {
    id: "image-resize",
    title: "Image resize",
    group: "attention",
    glyph: TERMINAL_GLYPHS.failed,
    tone: "danger",
    status: "Failed",
    age: "2h",
    overlap: "thumbnails/",
    explanation:
      "The last run stopped at its second step 2h ago. Run it again once the source folder is readable.",
    facts: [
      ["Last run", [{ text: "Failed 2h ago at step 2" }]],
      ["Schedule", [{ text: "Hourly" }]],
      ["Overlap", [{ text: "thumbnails/" }]],
    ],
    failure: {
      mark: { ...TERMINAL_GLYPHS.failed, tone: "danger" },
      runs: [{ text: "Could not read 3 source images" }],
      lines: [
        [{ text: "originals/2024/06/beach.jpg", role: "code" }],
        [{ text: "permission denied", tone: "faint" }],
      ],
    },
  },
  {
    id: "photo-archive",
    title: "Photo archive migration",
    group: "attention",
    glyph: TERMINAL_GLYPHS.attention,
    tone: "warning",
    status: "Stale",
    qualifier: { text: "↓12", ascii: "", tone: "muted" },
    age: "11d",
    explanation:
      "No run for 11 days, and 12 newer albums have arrived since. Run it again or pause it.",
    facts: [
      ["Last run", [{ text: "Passed 11d ago" }]],
      ["Backlog", [{ text: "12 new albums", tone: "warning" }]],
    ],
  },
  {
    id: "mail-digest",
    title: "Mail digest",
    group: "attention",
    glyph: TERMINAL_GLYPHS.attention,
    tone: "warning",
    status: "Needs input",
    age: "1h",
    explanation: "Waiting for a recipient list before its next run.",
    facts: [
      ["Last run", [{ text: "None yet" }]],
      ["Schedule", [{ text: "Daily at 07:00" }]],
    ],
  },
  {
    id: "search-index",
    title: "Search index",
    group: "running",
    glyph: TERMINAL_GLYPHS.running,
    tone: "accent",
    status: "Running",
    age: "1:12",
    meter: 0.4,
    explanation:
      "Started 1m 12s ago and usually takes about 3 minutes. The new index replaces the old one when it finishes.",
    facts: [
      ["Last run", [{ text: "Running now" }]],
      ["Schedule", [{ text: "Every 6 hours" }]],
    ],
  },
  {
    id: "log-rotation",
    title: "Log rotation",
    group: "running",
    glyph: TERMINAL_GLYPHS.active,
    tone: "accent",
    status: "Writing",
    age: "3m",
    overlap: "logs/",
    explanation: "Compressing yesterday's logs. Another job reads this folder.",
    facts: [
      ["Last run", [{ text: "Writing now" }]],
      ["Overlap", [{ text: "logs/" }]],
    ],
  },
  {
    id: "nightly-backup",
    title: "Nightly backup",
    group: "scheduled",
    glyph: TERMINAL_GLYPHS.queued,
    tone: "success",
    status: "Queued #1",
    age: "35m",
    explanation: "Next in line. It starts as soon as the running jobs finish.",
    facts: [
      ["Last run", [{ text: "Passed 1d ago" }]],
      ["Queue", [{ text: "#1" }]],
    ],
  },
  {
    id: "cache-warmup",
    title: "Cache warmup",
    group: "idle",
    glyph: TERMINAL_GLYPHS.idle,
    tone: "faint",
    status: "Idle",
    age: "2d",
    explanation: "Nothing to do until the next deploy.",
    facts: [["Last run", [{ text: "Passed 2d ago" }]]],
  },
  paused("Old exports"),
  paused("Thumbnail sweep"),
  paused("Weekly stats"),
];

const GROUPS: readonly {
  readonly id: string;
  readonly title: string;
  readonly foldable?: boolean;
}[] = [
  { id: "review", title: "Needs review" },
  { id: "attention", title: "Needs attention" },
  { id: "running", title: "Running" },
  { id: "scheduled", title: "Scheduled" },
  { id: "idle", title: "Idle" },
  { id: "paused", title: "Paused", foldable: true },
];

function marker(job: DemoJob): ApplicationGlyph {
  return {
    unicode: job.glyph.unicode,
    ascii: job.glyph.ascii,
    tone: job.tone,
    ...(job.glyph.animation === undefined ? {} : { animation: "spinner" }),
  };
}

function labelTone(job: DemoJob): TerminalTextTone {
  return job.tone === "faint" || job.tone === "accent" ? "muted" : job.tone;
}

function statusCell(job: DemoJob): readonly ApplicationRun[] {
  if (job.meter !== undefined) {
    const filled = Math.round(job.meter * 4);
    return [
      { text: job.status, tone: labelTone(job) },
      { text: " " },
      { text: "━".repeat(filled), ascii: "", tone: "accent" },
      { text: "─".repeat(4 - filled), ascii: "", tone: "faint" },
    ];
  }
  return [
    { text: job.status, tone: labelTone(job) },
    ...(job.qualifier === undefined ? [] : [{ text: " " }, job.qualifier]),
  ];
}

function row(job: DemoJob): ApplicationListItem<string> {
  return {
    id: job.id,
    title: job.title,
    marker: marker(job),
    cells: {
      ...(job.overlap === undefined
        ? {}
        : { flag: [{ text: "⇄", ascii: "&", tone: "faint" as const }] }),
      status: statusCell(job),
      age: [{ text: job.age, tone: "faint" }],
    },
    primary: `run:${job.id}`,
    keywords: job.status,
  };
}

function detail(job: DemoJob): readonly ApplicationDetailBlock[] {
  return [
    { kind: "heading", title: job.title, aside: [{ text: job.id }] },
    { kind: "state", glyph: marker(job), label: job.status, tone: job.tone },
    ...(job.meter === undefined ? [] : [{
      kind: "meter" as const,
      value: job.meter,
      caption: "1:12 of about 3m",
    }]),
    { kind: "text", runs: [{ text: job.explanation }] },
    {
      kind: "facts",
      rows: job.facts.map(([label, value]) => ({ label, value: [value] })),
    },
    ...(job.failure === undefined ? [] : [{
      kind: "section" as const,
      title: "Failure",
      blocks: [{ kind: "marks" as const, items: [job.failure] }],
    }]),
    ...(job.runs === undefined ? [] : [{
      kind: "section" as const,
      title: "Recent runs",
      count: job.runs.length,
      blocks: [{
        kind: "rows" as const,
        lead: { id: "run", width: 6 },
        columns: [{ id: "age", width: 3, align: "end" as const, priority: 1 }],
        items: job.runs,
      }],
    }]),
    {
      kind: "hints",
      items: [
        {
          key: "enter",
          label: "Run sample",
          description: "Lend the terminal to a short child",
          primary: true,
        },
        {
          key: "space",
          label: "Details",
          description: "Read this job at full width",
        },
      ],
    },
    ...(job.id === "quarterly-report"
      ? [{
        kind: "section" as const,
        title: "Notes",
        blocks: [{ kind: "block" as const, content: notes }],
      }]
      : []),
  ];
}

function strip(job: DemoJob): ApplicationDetailStrip {
  return {
    title: [
      { text: job.glyph.unicode, ascii: job.glyph.ascii, tone: job.tone },
      { text: " " },
      { text: job.title, role: "title" },
      { text: "  " },
      { text: job.status, tone: labelTone(job) },
    ],
    facts: job.facts.slice(0, 2).map(([, value]) => value),
  };
}

/** Layers and preferences the sample view carries besides its jobs. */
export interface ApplicationDemoViewOptions {
  readonly layers?: readonly ApplicationLayer<string>[];
  readonly mouse?: boolean;
}

/** The sample view for a set of jobs, an optional message, and open layers. */
export function applicationDemoView(
  jobs: readonly DemoJob[] = DEMO_JOBS,
  message?: ApplicationMessage,
  options: ApplicationDemoViewOptions = {},
): TerminalApplicationView<string> {
  const groups: ApplicationListGroup<string>[] = GROUPS.map((group) => ({
    ...group,
    ...(group.foldable === true ? { initiallyFolded: true } : {}),
    items: jobs.filter((job) => job.group === group.id).map(row),
  }));
  const review = jobs.filter((job) => job.group === "review").length;
  return {
    header: {
      leading: [
        { text: "Studio", role: "title" },
        { text: "  ·  ", ascii: "  -  ", tone: "faint" },
        { text: "jobs", tone: "muted" },
      ],
      trailing: [
        { text: String(review), role: "title" },
        { text: " to review", tone: "muted" },
      ],
      liveness: {
        state: "idle",
        labels: {
          idle: "Live",
          busy: "Refreshing",
          retrying: "Retrying",
          stale: "Offline",
        },
        busyAfterMs: 1500,
      },
    },
    body: {
      kind: "master-detail",
      list: {
        id: "jobs",
        groups,
        columns: [
          { id: "flag", width: 1, priority: 1 },
          { id: "status", width: 13, align: "end" },
          { id: "age", width: 4, align: "end", priority: 2 },
        ],
        filter: { label: "Filter" },
        density: {
          foldOrder: ["paused", "idle", "scheduled", "running"],
          neverFold: ["review", "attention"],
        },
      },
      detail: {
        follows: "jobs",
        content: Object.fromEntries(jobs.map((job) => [job.id, detail(job)])),
        strip: Object.fromEntries(jobs.map((job) => [job.id, strip(job)])),
      },
    },
    ...(message === undefined ? {} : { message }),
    footer: {
      left: [
        { key: "enter", label: "Run sample" },
        { key: "space", label: "Details" },
      ],
      right: [{ key: ".", label: "Actions" }, {
        key: "ctrl-k",
        label: "Commands",
      }],
      extra: [{ key: "/", label: "Filter" }, { key: "q", label: "Quit" }],
    },
    ...(options.layers === undefined || options.layers.length === 0
      ? {}
      : { layers: options.layers }),
    windowTitle: `Studio · ${review} to review`,
    tooSmallHints: [{ key: "q", label: "Quit" }],
    ...(options.mouse === true ? { input: { mouse: true } } : {}),
  };
}

/** The sample's key bindings: quit, actions, commands, a new job, and shortcuts. */
export const DEMO_KEYMAP: readonly ApplicationKeyBinding<string>[] = [
  { key: "q", action: "quit" },
  { key: ".", action: "menu" },
  { key: "ctrl-k", action: "palette" },
  { key: "n", action: "new" },
  { key: "?", action: "keys" },
  { key: "r", action: "rerun" },
  { key: "D", action: "delete" },
  {
    key: "ctrl-k",
    action: "palette-close",
    scope: { layer: "palette" },
    inFields: true,
  },
];

/** The first frame's tip, dismissed by the first key. */
export const DEMO_TIP: ApplicationMessage = {
  id: "tip",
  runs: [
    { text: "Tip", tone: "faint" },
    { text: "   Press " },
    { text: "/", role: "key" },
    { text: " to filter and " },
    { text: "Space", role: "key" },
    { text: " to read a job at full width." },
  ],
  dismiss: { onKey: true },
};

/** The fleet after the running search index finishes and joins those to review. */
export function finishedDemoJobs(): readonly DemoJob[] {
  return DEMO_JOBS.map((job): DemoJob => {
    if (job.id !== "search-index") return job;
    const { meter: _meter, ...rest } = job;
    return {
      ...rest,
      group: "review",
      glyph: TERMINAL_GLYPHS.done,
      tone: "success",
      status: "Ready",
      age: "now",
      explanation: "Finished just now. The new index replaced the old one.",
      facts: [["Last run", [{ text: "Passed just now" }]]],
    };
  });
}

/** How the demonstration starts. */
export interface ApplicationDemoSettings {
  /** When the running job finishes; defaults to 1800 ms. */
  readonly updateAfterMs?: number;
  /** Show the tip on the first frame; defaults to true. */
  readonly tip?: boolean;
}

/** Build deterministic sample data and caller-owned navigation for the live application review. */
export function applicationDemoOptions(
  foreground: (title: string) => void | Promise<void>,
  settings: ApplicationDemoSettings = {},
): TerminalApplicationOptions<string> {
  const updateAfterMs = settings.updateAfterMs ?? 1800;
  let jobs: readonly DemoJob[] = DEMO_JOBS;
  let message: ApplicationMessage | undefined = settings.tip === false
    ? undefined
    : DEMO_TIP;
  let layers: readonly ApplicationLayer<string>[] = [];
  let mouse = false;
  let selected: string | undefined = DEMO_JOBS[0]?.id;
  let form: DemoFormValues = { title: "", schedule: "daily", notes: "" };
  let live: TerminalApplicationContext<string> | undefined;
  const view = () => applicationDemoView(jobs, message, { layers, mouse });
  const publish = () => live?.update(view());
  const find = (id: string | undefined) =>
    jobs.find((candidate) => candidate.id === id);
  const toast = (text: string) => {
    message = {
      id: `toast-${text}`,
      runs: [{ text }],
      dismiss: { afterMs: 6000, onKey: true },
    };
  };
  /** A sheet replaces the menu that opened it; any other layer stacks. */
  const open = (layer: ApplicationLayer<string>) => {
    layers = [
      ...layers.filter((existing) =>
        existing.kind !== "menu" && existing.id !== layer.id
      ),
      layer,
    ].slice(-2);
  };
  const close = (id: string) => {
    layers = layers.filter((layer) => layer.id !== id);
  };
  return {
    view: view(),
    keymap: DEMO_KEYMAP,
    start(context) {
      live = context;
      const timer = setTimeout(() => {
        jobs = finishedDemoJobs();
        publish();
      }, updateAfterMs);
      return () => clearTimeout(timer);
    },
    onSelectionChange(listId, itemId) {
      if (listId === "jobs") selected = itemId;
    },
    onSelectionMoved(_list, itemId, move) {
      if (move.kind !== "regrouped") return;
      const job = jobs.find((candidate) => candidate.id === itemId);
      const group = GROUPS.find((candidate) => candidate.id === move.to);
      if (job === undefined || group === undefined) return;
      message = {
        id: `moved-${itemId}`,
        runs: [{ text: `${job.title} moved to ${group.title}` }],
        dismiss: { afterMs: 6000, onKey: true },
      };
      publish();
    },
    onDismiss(target, _via, context) {
      if ("message" in target) {
        if (message?.id === target.message) message = undefined;
      } else close(target.layer);
      context.update(view());
    },
    onField(layerId, fieldId, value, context) {
      if (layerId !== "new") return;
      if (fieldId === "title") form = { ...form, title: value };
      if (fieldId === "schedule") form = { ...form, schedule: value };
      if (fieldId === "notes") form = { ...form, notes: value };
      open(demoNewJobForm(form));
      context.update(view());
    },
    onAction(action, context) {
      const [verb, id] = action.split(":");
      const job = find(id ?? selected);
      switch (verb) {
        case "quit":
          return { kind: "exit" };
        case "menu":
          if (job !== undefined) open(demoActionsMenu(job));
          break;
        case "palette":
          open(demoPalette(jobs, mouse));
          break;
        case "palette-close":
          close("palette");
          break;
        case "keys":
          open(demoKeysReader());
          break;
        case "new":
          form = { title: "", schedule: "daily", notes: "" };
          open(demoNewJobForm(form));
          break;
        case "rerun":
          if (job !== undefined) open(demoRunSheet(job));
          break;
        case "delete":
          if (job !== undefined) open(demoDeleteSheet(job));
          break;
        case "log":
          if (job !== undefined) open(demoLogReader(job));
          break;
        case "mouse":
          // Turning mouse input on shows the package's selection hint.
          mouse = !mouse;
          close("palette");
          if (!mouse) toast("Mouse off");
          break;
        case "confirm-run":
          if (job !== undefined) {
            // The sample shows a run that started eleven seconds ago.
            const now = context.now();
            open(
              demoRunSheet(job, "working", { startedAt: now - 11_000, now }),
            );
          }
          break;
        case "stop":
          close("run");
          if (job !== undefined) toast(`Stopped ${job.title}`);
          break;
        case "confirm-delete":
          close("delete");
          if (job !== undefined) {
            jobs = jobs.filter((candidate) => candidate.id !== job.id);
            toast(`Deleted ${job.title}; its last output is kept for a while`);
          }
          break;
        case "pause":
          close("delete");
          close("actions");
          if (job !== undefined) toast(`Paused ${job.title}`);
          break;
        case "schedule":
          close("actions");
          toast("Schedules are not part of this sample");
          break;
        case "create":
        case "create-run":
          close("new");
          toast(`Created ${form.title === "" ? "a job" : form.title}`);
          break;
        case "edit-notes":
          return {
            kind: "foreground",
            handoff: [{ text: "Editing the notes · press Enter to come back" }],
            run: async () => {
              await foreground("the notes");
              context.setField("new", "notes", `${form.notes}Edited outside.`);
            },
          };
        case "paused":
          close("palette");
          if (jobs.some((candidate) => candidate.group === "paused")) {
            context.select("jobs", "old-exports", { reveal: true });
          }
          break;
        case "open":
          return {
            kind: "foreground",
            handoff: [{ text: `Opening ${id ?? "the output"}` }],
            run: () => foreground(id ?? "the output"),
          };
        case "run": {
          if (job === undefined) return undefined;
          return {
            kind: "foreground",
            handoff: [{
              text: `Running ${job.title} · press Enter to come back`,
            }],
            run: () => foreground(job.title),
          };
        }
        default:
          return undefined;
      }
      context.update(view());
      return undefined;
    },
  };
}
