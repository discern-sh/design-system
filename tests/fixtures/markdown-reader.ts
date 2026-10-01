/** One Markdown document open in the browser, driven without a terminal. */
import { stripAnsi } from "../../src/cli/ansi.ts";
import type {
  MarkdownBrowserDocument,
  MarkdownBrowserResumableState,
} from "../../src/cli/interactive/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { markdownBrowserApplication } from "../../src/cli/interactive/markdown-browser-request.ts";
import type {
  MarkdownBrowserController,
  MarkdownBrowserStep,
} from "../../src/cli/interactive/markdown-browser-view.ts";
import { ApplicationPreview } from "../../catalogue/application-preview.ts";

/** A browser opened on one document, and the controller behind it. */
export interface DocumentReader {
  readonly preview: ApplicationPreview<MarkdownBrowserStep>;
  readonly controller: MarkdownBrowserController<never>;
}

/** Open a browser of one document straight onto it. */
export function documentReader(
  document: MarkdownBrowserDocument,
  columns: number,
  rows: number,
  initialState: MarkdownBrowserResumableState = {
    history: [{ kind: "document", id: document.id }],
  },
): DocumentReader {
  const { application, controller } = markdownBrowserApplication<never>({
    label: "Documents",
    entries: [document],
    initialState,
  }, { respond: () => undefined, closing: () => {} });
  return {
    preview: new ApplicationPreview(
      application,
      testTerminalCapabilities({ columns }),
      rows,
    ),
    controller,
  };
}

/**
 * The first line of the document on screen: below the header, past blank
 * rows and the upper overflow marker.
 */
export function topLine(
  preview: ApplicationPreview<MarkdownBrowserStep>,
): string {
  return preview.text.split("\n").slice(1).find((row) =>
    row.trim() !== "" && !/more (?:·|- PgUp|above)/u.test(row)
  ) ?? "";
}

/** Whether a text is on the first line of the document on screen. */
export function onTop(
  preview: ApplicationPreview<MarkdownBrowserStep>,
  text: string,
): boolean {
  return topLine(preview).includes(text);
}

/** Scroll down a line at a time until a text is on the first line shown. */
export function scrollToTop(
  preview: ApplicationPreview<MarkdownBrowserStep>,
  text: string,
): void {
  for (let line = 0; line < 400 && !onTop(preview, text); line += 1) {
    const before = preview.text;
    preview.key("down");
    if (preview.text === before) break;
  }
  if (!onTop(preview, text)) {
    throw new Error(`${text} never reaches the top:\n${preview.text}`);
  }
}

/** The plain rows of every keyframe a transcript painted, in order. */
export function keyframes(output: string): readonly (readonly string[])[] {
  const erase = "\x1b[2J\x1b[H";
  return output.split("\x1b[?2026h").flatMap((paint) => {
    const at = paint.indexOf(erase);
    if (at < 0) return [];
    const body = paint.slice(at + erase.length).split("\x1b[?2026l")[0] ?? "";
    return [
      body.replaceAll("\r\n", "\n").split("\n").map((row) => stripAnsi(row)),
    ];
  });
}
