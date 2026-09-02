import { fromFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registry } from "../../catalogue/generated/registry.ts";

const packageRoot = fromFileUrl(new URL("../../", import.meta.url));
const stateAttributes = ["data-discern-tone", "data-discern-status"] as const;
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

interface HtmlElement {
  readonly tag: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: Array<HtmlElement | string>;
}

/** One tone- or status-bearing rendered element without a non-colour witness. */
export interface MissingWitnessHtmlHit {
  readonly tag: string;
  readonly attribute: (typeof stateAttributes)[number];
  readonly state: string;
  readonly occurrence: number;
}

/** One canonical example occurrence admitted by the repository census. */
export interface MissingWitnessHit extends MissingWitnessHtmlHit {
  readonly file: string;
  readonly line: number;
  readonly component: string;
  readonly example: string;
}

function decodeHtml(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(?:#(?<decimal>\d+)|#x(?<hex>[\da-f]+)|(?<name>[a-z]+));/giu,
    (entity, decimal, hex, name) => {
      if (decimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      }
      if (hex !== undefined) {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      }
      return named[name?.toLowerCase() ?? ""] ?? entity;
    },
  );
}

function parseAttributes(source: string): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
  for (const match of source.matchAll(pattern)) {
    const name = match[1];
    if (name === undefined) continue;
    attributes.set(
      name.toLowerCase(),
      decodeHtml(match[2] ?? match[3] ?? match[4] ?? ""),
    );
  }
  return attributes;
}

function parseHtml(source: string): HtmlElement {
  const root: HtmlElement = {
    tag: "root",
    attributes: new Map(),
    children: [],
  };
  const stack: HtmlElement[] = [root];
  const tokens = source.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/gu) ?? [];
  for (const token of tokens) {
    const parent = stack.at(-1);
    if (parent === undefined || token.startsWith("<!--")) continue;
    if (!token.startsWith("<")) {
      parent.children.push(decodeHtml(token));
      continue;
    }
    const closing = /^<\/\s*([^\s>]+)/u.exec(token);
    if (closing !== null) {
      const tag = closing[1]?.toLowerCase();
      while (stack.length > 1) {
        const element = stack.pop();
        if (element?.tag === tag) break;
      }
      continue;
    }
    const opening = /^<\s*([^\s/>]+)/u.exec(token);
    const rawTag = opening?.[1];
    if (rawTag === undefined || rawTag.startsWith("!")) continue;
    const tag = rawTag.toLowerCase();
    const attributesStart = opening?.[0].length ?? 1;
    const attributes = parseAttributes(
      token.slice(
        attributesStart,
        token.length - (token.endsWith("/>") ? 2 : 1),
      ),
    );
    const element: HtmlElement = { tag, attributes, children: [] };
    parent.children.push(element);
    if (!token.endsWith("/>") && !voidElements.has(tag)) stack.push(element);
  }
  return root;
}

function isHidden(
  element: HtmlElement,
  includeVisuallyHidden: boolean,
): boolean {
  if (element.attributes.get("aria-hidden")?.toLowerCase() === "true") {
    return true;
  }
  if (element.attributes.has("hidden")) return true;
  if (
    element.tag === "script" || element.tag === "style" ||
    element.tag === "template"
  ) {
    return true;
  }
  const style = element.attributes.get("style") ?? "";
  if (
    /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)(?:;|$)/iu.test(
      style,
    )
  ) {
    return true;
  }
  if (!includeVisuallyHidden) {
    const className = element.attributes.get("class") ?? "";
    if (
      /(?:^|\s)(?:discern-visually-hidden|sr-only)(?:\s|$)/u.test(className)
    ) {
      return true;
    }
  }
  return false;
}

function descendantText(
  element: HtmlElement,
  includeVisuallyHidden: boolean,
): string {
  if (isHidden(element, includeVisuallyHidden)) return "";
  return element.children.map((child) =>
    typeof child === "string"
      ? child
      : child.tag === "title"
      ? ""
      : descendantText(child, includeVisuallyHidden)
  ).join(" ");
}

function normalizedWords(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function namesState(value: string, state: string): boolean {
  const words = ` ${normalizedWords(value)} `;
  const expected = normalizedWords(state);
  return expected !== "" && words.includes(` ${expected} `);
}

function allElements(root: HtmlElement): readonly HtmlElement[] {
  const elements: HtmlElement[] = [];
  const visit = (element: HtmlElement): void => {
    elements.push(element);
    for (const child of element.children) {
      if (typeof child !== "string") visit(child);
    }
  };
  visit(root);
  return elements;
}

function accessibleName(
  element: HtmlElement,
  ids: ReadonlyMap<string, HtmlElement>,
): string {
  const label = element.attributes.get("aria-label");
  if (label !== undefined) return label;
  const alt = element.attributes.get("alt");
  if (alt !== undefined) return alt;
  const labelledBy = element.attributes.get("aria-labelledby")?.trim();
  if (labelledBy !== undefined && labelledBy !== "") {
    return labelledBy.split(/\s+/u).map((id) => {
      const labelElement = ids.get(id);
      return labelElement === undefined
        ? ""
        : descendantText(labelElement, true);
    }).join(" ");
  }
  const title = element.attributes.get("title");
  if (title !== undefined) return title;
  const svgTitle = element.children.find((child) =>
    typeof child !== "string" && child.tag === "title"
  );
  if (svgTitle !== undefined && typeof svgTitle !== "string") {
    return descendantText(svgTitle, true);
  }
  return descendantText(element, true);
}

function isIconOrGlyph(element: HtmlElement): boolean {
  if (element.tag === "img" || element.tag === "svg") return true;
  if (element.attributes.get("role") === "img") return true;
  const className = element.attributes.get("class") ?? "";
  return /(?:^|[-_\s])(?:icon|glyph|marker|sigil)(?:$|[-_\s])/iu.test(
    className,
  );
}

function hasNamedIcon(
  element: HtmlElement,
  state: string,
  ids: ReadonlyMap<string, HtmlElement>,
): boolean {
  const visit = (candidate: HtmlElement, hidden: boolean): boolean => {
    const candidateHidden = hidden || isHidden(candidate, true);
    if (
      !candidateHidden && isIconOrGlyph(candidate) &&
      namesState(accessibleName(candidate, ids), state)
    ) {
      return true;
    }
    return candidate.children.some((child) =>
      typeof child !== "string" && visit(child, candidateHidden)
    );
  };
  return visit(element, false);
}

/** Inspect rendered HTML without a browser and list every missing witness. */
export function missingWitnessesInHtml(
  html: string,
): readonly MissingWitnessHtmlHit[] {
  const root = parseHtml(html);
  const elements = allElements(root);
  const ids = new Map<string, HtmlElement>();
  for (const element of elements) {
    const id = element.attributes.get("id");
    if (id !== undefined) ids.set(id, element);
  }
  const hits: MissingWitnessHtmlHit[] = [];
  let occurrence = 0;
  for (const element of elements) {
    for (const attribute of stateAttributes) {
      const state = element.attributes.get(attribute)?.trim();
      if (state === undefined || state === "") continue;
      occurrence += 1;
      if (namesState(descendantText(element, false), state)) continue;
      if (hasNamedIcon(element, state, ids)) continue;
      hits.push({ tag: element.tag, attribute, state, occurrence });
    }
  }
  return hits;
}

function sourceLine(source: string, example: string): number {
  const escaped = example.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`\\bid\\s*:\\s*["']${escaped}["']`, "u").exec(
    source,
  );
  if (match?.index === undefined) return 1;
  return source.slice(0, match.index).split("\n").length;
}

/** Render every canonical Web example through the React adapter and census it. */
export async function missingWitnessHits(): Promise<
  readonly MissingWitnessHit[]
> {
  const hits: MissingWitnessHit[] = [];
  for (const entry of registry) {
    const group = entry.meta.group.toLowerCase();
    const file =
      `src/components/${group}/${entry.meta.slug}/${entry.meta.slug}.examples.tsx`;
    const source = await Deno.readTextFile(`${packageRoot}/${file}`);
    for (const example of entry.webExamples) {
      const html = renderToStaticMarkup(createElement(example.Example));
      const line = sourceLine(source, example.id);
      for (const hit of missingWitnessesInHtml(html)) {
        hits.push({
          ...hit,
          file,
          line,
          component: entry.meta.slug,
          example: example.id,
        });
      }
    }
  }
  return hits;
}

function verboseRequested(args: readonly string[]): boolean {
  if (args.length === 0) return false;
  if (args.length === 1 && args[0] === "--verbose") return true;
  throw new TypeError("The only supported option is --verbose");
}

if (import.meta.main) {
  const verbose = verboseRequested(Deno.args);
  const hits = await missingWitnessHits();
  if (verbose) {
    for (const hit of hits) {
      console.log(
        `${hit.file}:${hit.line}: [${hit.component}/${hit.example}] <${hit.tag} ${hit.attribute}="${hit.state}"> lacks a visible state name or accessibly named icon`,
      );
    }
  }
  console.log(`DISCERN_METRIC missing_witnesses ${hits.length}`);
}
