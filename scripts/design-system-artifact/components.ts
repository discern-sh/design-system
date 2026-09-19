/**
 * Render the component cards: for each selected Component, its canonical Web
 * examples as static HTML through the React adapter, a README from the
 * Component Metadata and the generated author guide, and the harvested prop
 * declarations that make up `components/index.d.ts`.
 */
import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  componentAuthorGuide,
  componentMetadata,
} from "../../src/component-metadata.ts";
import type {
  ComponentGroup,
  ComponentMeta,
} from "../../src/types/component-meta.ts";
import { escapeHtml, pascalCase, required, writeText } from "./support.ts";

/**
 * The Components that get a card, with a starting card height in pixels (the
 * page grows a card to fit). Order follows the Catalogue; the artifact is a
 * prototyping kit, not the whole Catalogue.
 */
export const cardHeights: Readonly<Record<string, number>> = {
  brand: 120,
  button: 120,
  "icon-button": 100,
  "theme-toggle": 100,
  stack: 200,
  cluster: 120,
  grid: 220,
  heading: 200,
  kicker: 100,
  badge: 100,
  tag: 100,
  card: 260,
  table: 300,
  stat: 160,
  sparkline: 140,
  divider: 120,
  window: 320,
  terminal: 260,
  field: 160,
  input: 200,
  textarea: 200,
  select: 200,
  checkbox: 160,
  radio: 160,
  switch: 160,
  "segmented-control": 160,
  banner: 260,
  toast: 160,
  tooltip: 140,
  dialog: 320,
  meter: 160,
  progress: 160,
  "empty-state": 240,
  tabs: 200,
  breadcrumbs: 100,
  avatar: 120,
  "avatar-group": 120,
  persona: 140,
  "agent-avatar": 120,
  worklog: 320,
  fleet: 320,
  command: 240,
  "result-summary": 260,
  diagnostic: 420,
  "standard-meter": 200,
  procedure: 480,
  kbd: 100,
  pager: 140,
  "site-header": 180,
  "hero-block": 460,
  "metrics-band": 220,
  testimonial: 300,
  "cta-band": 300,
  prose: 480,
  callout: 260,
  blockquote: 200,
  "pull-quote": 220,
  "code-block": 260,
  timeline: 420,
  chart: 360,
};

const groupFolders: Readonly<Record<ComponentGroup, string>> = {
  Core: "core",
  Layout: "layout",
  Display: "display",
  Artwork: "artwork",
  Forms: "forms",
  Feedback: "feedback",
  Navigation: "navigation",
  People: "people",
  Agents: "agents",
  Workflow: "workflow",
  Docs: "docs",
  Marketing: "marketing",
  Editorial: "editorial",
};

/** One rendered card and the facts the index and provenance need from it. */
export interface RenderedComponent {
  readonly meta: ComponentMeta;
  /** The artifact folder name, `components/<folder>/`. */
  readonly folder: string;
  /** The React adapter export, also the `window.Discern` member. */
  readonly reactName: string;
  /** The implementation path relative to the repository root. */
  readonly sourcePath: string;
}

interface CatalogueExample {
  readonly id: string;
  readonly Example: ComponentType;
}

function guideSection(slug: string): string {
  const lines = componentAuthorGuide.split("\n");
  const start = lines.findIndex((line) =>
    /^#{2,3} .+ \(`[a-z0-9-]+`\)$/.test(line) && line.endsWith(`(\`${slug}\`)`)
  );
  if (start < 0) throw new TypeError(`No author-guide section for ${slug}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,3} /.test(required(lines[index], "guide line"))) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

function propsBlock(section: string): string {
  const index = section.indexOf("\nProps:");
  return index < 0 ? "" : section.slice(index + 1).trim();
}

function reactName(section: string, slug: string): string {
  return required(
    /React: `([A-Za-z]+)`/.exec(section)?.[1],
    `React adapter name for ${slug}`,
  );
}

function catalogueExamples(
  module: unknown,
  slug: string,
): readonly CatalogueExample[] {
  const list = (module as { catalogueExamples?: unknown }).catalogueExamples;
  if (!Array.isArray(list)) {
    throw new TypeError(`${slug} examples export no catalogueExamples array`);
  }
  return list.map((entry): CatalogueExample => {
    const { id, Example } = entry as { id?: unknown; Example?: unknown };
    if (
      typeof id !== "string" ||
      (typeof Example !== "function" && typeof Example !== "object") ||
      Example === null
    ) {
      throw new TypeError(`${slug} has a malformed Catalogue example`);
    }
    return { id, Example: Example as ComponentType };
  });
}

/**
 * Collect top-level `interface` and `type` declarations from a Component's
 * sources, following its relative imports one level into sibling Component
 * modules for the vocabulary they share. Documentation only: the artifact never
 * type-checks the result.
 */
async function harvestDeclarations(
  path: string,
  out: string[],
  seen: Set<string>,
  depth: number,
): Promise<void> {
  let source: string;
  try {
    source = await Deno.readTextFile(path);
  } catch {
    return;
  }
  const declaration = /^(?:export )?(interface|type) ([A-Za-z0-9_]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source))) {
    const kind = match[1];
    const name = required(match[2], "declaration name");
    if (seen.has(name)) continue;
    let end = -1;
    let level = 0;
    if (kind === "interface") {
      let started = false;
      for (let index = match.index; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") {
          level += 1;
          started = true;
        } else if (char === "}") {
          level -= 1;
          if (started && level === 0) {
            end = index + 1;
            break;
          }
        }
      }
    } else {
      for (let index = match.index; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{" || char === "(" || char === "[") level += 1;
        else if (char === "}" || char === ")" || char === "]") level -= 1;
        else if (char === ";" && level === 0) {
          end = index + 1;
          break;
        }
      }
    }
    if (end < 0) continue;
    seen.add(name);
    const before = source.slice(0, match.index);
    const docStart = before.lastIndexOf("/**");
    const doc = before.slice(docStart);
    const documented = docStart >= 0 && /^\/\*\*[^]*?\*\/\s*$/.test(doc) &&
      !doc.includes("@module");
    out.push(
      (documented ? `${doc.trim()}\n` : "") +
        source.slice(match.index, end).trim(),
    );
  }
  if (depth === 0) return;
  const directory = path.slice(0, path.lastIndexOf("/") + 1);
  for (const imported of source.matchAll(/from "(\.\.?\/[^"]+\.tsx?)"/g)) {
    const target =
      new URL(required(imported[1], "import"), `file://${directory}`)
        .pathname;
    if (
      target.includes("/src/components/") &&
      !/\.(examples|meta|cli)\./.test(target) &&
      !target.endsWith("class-names.ts") &&
      !target.endsWith("component-type.ts")
    ) {
      await harvestDeclarations(target, out, seen, depth - 1);
    }
  }
}

async function harvestTypes(
  directory: string,
  seen: Set<string>,
): Promise<string> {
  const out: string[] = [];
  const names: string[] = [];
  for await (const entry of Deno.readDir(directory)) names.push(entry.name);
  for (const name of names.sort()) {
    if (
      !/\.(tsx|types\.ts)$/.test(name) || /\.(examples|meta|cli)\./.test(name)
    ) {
      continue;
    }
    await harvestDeclarations(`${directory}/${name}`, out, seen, 1);
  }
  return out.join("\n\n");
}

function previewDocument(
  meta: ComponentMeta,
  height: number,
  examples: readonly CatalogueExample[],
): string {
  const sections = examples.map(({ id, Example }) => {
    const html = renderToStaticMarkup(createElement(Example));
    for (const reference of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = required(reference[1], "reference");
      if (/^https?:\/\//.test(value) || /^\.\.?\//.test(value)) {
        throw new TypeError(
          `${meta.slug}/${id} references ${value}; previews must fetch nothing`,
        );
      }
    }
    const label = examples.length > 1
      ? `<p class="artifact-example-label">${
        escapeHtml(id.replace(/-/g, " "))
      }</p>`
      : "";
    return `<section class="artifact-example" data-example="${id}">${label}<div class="artifact-example-body">${html}</div></section>`;
  });
  return `<!-- @dsCard group="${meta.group}" height=${height} -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.name)} — preview</title>
<style>
  html, body { margin: 0; background: transparent; }
  .artifact-preview { padding: var(--discern-space-6); }
  .artifact-example + .artifact-example { margin-block-start: var(--discern-rhythm-group); padding-block-start: var(--discern-rhythm-group); border-block-start: 1px solid var(--discern-color-border); }
  .artifact-example-label { margin: 0 0 var(--discern-rhythm-related); color: var(--discern-color-ink-faint); font: 600 var(--discern-font-size-xs)/var(--discern-leading-snug) var(--discern-font-ui); letter-spacing: 0.11em; text-transform: uppercase; }
</style>
</head>
<body>
<div class="artifact-preview" data-discern-root data-discern-theme="light">
${sections.join("\n")}
</div>
<script>
  (function () {
    var root = document.querySelector("[data-discern-root]");
    var sync = function () { root.setAttribute("data-discern-theme", document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"); };
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  })();
</script>
</body>
</html>
`;
}

function readme(
  meta: ComponentMeta,
  name: string,
  folder: string,
  section: string,
  examples: readonly CatalogueExample[],
): string {
  const bullets = (items: readonly string[] | undefined): string =>
    items?.length ? items.map((item) => `- ${item}`).join("\n") : "";
  const use = bullets(meta.useWhen) ||
    "- The description above names the situation; weigh the sibling components in the same group.";
  const not = bullets(meta.notWhen);
  const accessibility = bullets(meta.accessibility) ||
    "- Visible focus and readable disabled states are built into the package CSS.";
  const terminal = meta.cli.stance === "rendered"
    ? `Rendered in the terminal by the package's pure \`render${folder}Cli\` renderer, so the same meaning survives in a CLI.`
    : `No terminal rendering: ${meta.cli.reason}`;
  const behaviours = meta.behaviors?.length
    ? `\n\nBrowser behaviour: this component declares the \`${
      meta.behaviors.join("`, `")
    }\` runtime script in the real package; the preview here shows its static fallback.`
    : "";
  return `# ${meta.name}

${meta.description} React adapter: \`${name}\` (\`window.Discern.${name}\` in this bundle); semantic HTML class family \`discern-${meta.slug}\`.

## Use it when

${use}
${not ? `\n## Prefer another route when\n\n${not}\n` : ""}
## What the consumer provides

${
    propsBlock(section) ||
    "Children and the native attributes of the rendered element."
  }

## Accessibility

${accessibility}

## Terminal

${terminal}${behaviours}

## Examples

The preview renders the package's own canonical examples: ${
    examples.map(({ id }) => `\`${id}\``).join(", ")
  }.
`;
}

/** Write every card and `components/index.d.ts` under `out/project/`. */
export async function renderComponentCards(
  root: URL,
  out: URL,
): Promise<readonly RenderedComponent[]> {
  const chosen = componentMetadata.filter((meta) => meta.slug in cardHeights);
  const unknown = Object.keys(cardHeights).filter((slug) =>
    !chosen.some((meta) => meta.slug === slug)
  );
  if (unknown.length > 0) {
    throw new TypeError(`Unknown component slugs: ${unknown.join(", ")}`);
  }
  const rendered: RenderedComponent[] = [];
  const declarations: string[] = [
    "// discern design system — React adapter types (documentation only; not type-checked here).",
    "// Unqualified React types (ReactNode, HTMLAttributes, ButtonHTMLAttributes, …) come from react 18.3.",
    '// In the package these are exported from "@discern-sh/design-system/react"; in this bundle they live on window.Discern.',
    "",
  ];
  const seen = new Set<string>();
  for (const meta of chosen) {
    const relative = `src/components/${groupFolders[meta.group]}/${meta.slug}`;
    const directory = new URL(`${relative}/`, root);
    const module = await import(
      new URL(`${meta.slug}.examples.tsx`, directory).href
    );
    const examples = catalogueExamples(module, meta.slug);
    const section = guideSection(meta.slug);
    const name = reactName(section, meta.slug);
    const folder = pascalCase(meta.slug);
    const height = required(cardHeights[meta.slug], "card height");
    await writeText(
      new URL(`project/components/${folder}/preview.html`, out),
      previewDocument(meta, height, examples),
    );
    await writeText(
      new URL(`project/components/${folder}/README.md`, out),
      readme(meta, name, folder, section, examples),
    );
    declarations.push(
      `// ---- ${meta.name} (${meta.slug})`,
      await harvestTypes(directory.pathname.replace(/\/$/, ""), seen),
      `export declare const ${name}: import("react").ForwardRefExoticComponent<${name}Props & import("react").RefAttributes<HTMLElement>>;`,
      "",
    );
    rendered.push({
      meta,
      folder,
      reactName: name,
      sourcePath: `${relative}/${meta.slug}.tsx`,
    });
  }
  await writeText(
    new URL("project/components/index.d.ts", out),
    declarations.join("\n"),
  );
  return rendered;
}
