/** Public contracts for the link-aware Markdown browser. */

export {
  DEFAULT_MARKDOWN_BROWSER_COPY,
  MarkdownBrowserRefusalError,
} from "./markdown-browser-model.ts";
export type {
  MarkdownBrowserAction,
  MarkdownBrowserActionResult,
  MarkdownBrowserCopy,
  MarkdownBrowserDocument,
  MarkdownBrowserDocumentFact,
  MarkdownBrowserEntry,
  MarkdownBrowserExitAction,
  MarkdownBrowserExitResult,
  MarkdownBrowserExternalLinkResult,
  MarkdownBrowserGeometry,
  MarkdownBrowserGroupHeading,
  MarkdownBrowserHandlers,
  MarkdownBrowserLinkResolution,
  MarkdownBrowserLinkResolver,
  MarkdownBrowserLinkResolverInput,
  MarkdownBrowserOptions,
  MarkdownBrowserPlace,
  MarkdownBrowserRefusalReason,
  MarkdownBrowserResult,
  MarkdownBrowserResumableState,
} from "./markdown-browser-model.ts";
export {
  markdownBrowserCommand,
  requestMarkdownBrowser,
} from "./markdown-browser-request.ts";
export type { MarkdownBrowserRuntime } from "./markdown-browser-request.ts";
