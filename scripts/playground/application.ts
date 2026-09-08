/** Generic terminal application demonstration consuming only public package entrypoints. */
import {
  createCliBlock,
  renderMarkdownCli,
} from "@discern-sh/design-system/cli";
import {
  type TerminalApplicationOptions,
  type TerminalApplicationView,
} from "@discern-sh/design-system/cli/interactive";

const guide = createCliBlock(renderMarkdownCli, {
  source: `# A little room to work

This is a small collection of sample projects. Open an item to see its controls.

## Keep your place

The list stays open while its status changes. The focus marker belongs to navigation; the small status beside it belongs to the item.

Use **Tab** to move between the list and this reading region. On a small terminal, the focused region gets the whole screen.

## Take a short detour

Open an item and choose **Run sample**. A harmless child fixture borrows the terminal. Press Enter there to come back to the same selection and reading position.

## Read at your own pace

Arrow keys move one line. Page Up and Page Down move a page. Home and End reach the edges.

Resize at any time. Wide terminals put the regions side by side; tall terminals stack them. Short terminals keep the active region reachable.

## No hurry

There are no real projects or actions here. All data is deterministic and every action is a sample.
`,
  maxWidth: 68,
});

/** Build deterministic sample data and caller-owned navigation for the live application review. */
export function applicationDemoOptions(
  foreground: () => void | Promise<void>,
  updateAfterMs = 1800,
): TerminalApplicationOptions<string> {
  let ready = false;
  let opened: string | undefined;
  let live: Parameters<
    NonNullable<TerminalApplicationOptions<string>["start"]>
  >[0];
  const labels = [
    "Field notes",
    "Small atlas",
    "Reading room",
    "Common ground",
    "Paper trail",
    "Quiet hours",
  ];
  const view = (focus?: string): TerminalApplicationView<string> => ({
    title: opened === undefined ? "Studio" : `Studio / ${opened}`,
    tip: opened === undefined
      ? "Tip: ? opens the guide. Watch Field notes settle."
      : "Tip: Run sample returns you to the same place.",
    ...(focus === undefined ? {} : { focusedRegionId: focus }),
    regions: [
      opened === undefined
        ? {
          kind: "choices",
          id: "projects",
          title: "Projects",
          entries: labels.map((label, index) => ({
            id: String(index),
            label,
            value: label,
            indicator: {
              content: index === 0 && !ready ? "◌" : "✓",
              ascii: index === 0 && !ready ? "~" : "+",
              tone: index === 0 && !ready ? "neutral" : "success",
            },
            status: {
              content: index === 0 && !ready ? "Working" : "Ready",
              tone: index === 0 && !ready ? "neutral" : "success",
            },
            description: index === 0
              ? "A small set of observations, nearly ready to read."
              : "A little space for a useful idea.",
          })),
        }
        : {
          kind: "choices",
          id: `actions-${opened}`,
          title: "Actions",
          entries: [
            {
              id: "read",
              label: "Read the guide",
              value: "read",
              description:
                "Explore the reading pane without leaving this item.",
            },
            {
              id: "run",
              label: "Run sample",
              value: "run",
              description: "Borrow the terminal for a harmless child fixture.",
            },
            {
              id: "export",
              label: "Export sample",
              value: "export",
              disabled: true,
              description: "Unavailable in this demonstration.",
            },
            { id: "back", label: "Back to projects", value: "back" },
          ],
        },
      { kind: "reading", id: "guide", title: "Guide", content: guide },
    ],
  });
  return {
    view: view(),
    start(context) {
      live = context;
      const timer = setTimeout(() => {
        ready = true;
        context.update(view());
      }, updateAfterMs);
      return () => clearTimeout(timer);
    },
    onKey(key, context) {
      if (key.kind === "text" && key.text === "q") return { kind: "exit" };
      if (key.kind === "text" && key.text === "?") {
        context.update(view("guide"));
        return { kind: "handled" };
      }
      if (
        key.kind === "named" && key.name === "escape" && opened !== undefined
      ) {
        opened = undefined;
        context.update(view("projects"));
        return { kind: "handled" };
      }
      return undefined;
    },
    onAction(action, context) {
      if (action.regionId === "projects") {
        opened = action.value;
        context.update(view(`actions-${opened}`));
        return;
      }
      if (action.value === "read") context.update(view("guide"));
      if (action.value === "back") {
        opened = undefined;
        context.update(view("projects"));
      }
      if (action.value === "run") {
        return {
          kind: "foreground",
          run: async () => {
            await foreground();
            live.update(view());
          },
        };
      }
      return undefined;
    },
  };
}
