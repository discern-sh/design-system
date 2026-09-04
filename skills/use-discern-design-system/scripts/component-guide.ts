/**
 * Print the installed `@discern-sh/design-system` Component author guide,
 * whole or filtered, so an agent loads only the sections its task needs.
 *
 * Run it from the consumer project with that project's config, so the
 * project's own package alias and pinned version resolve. The package is
 * imported dynamically, which needs read permission when it resolves to a
 * local checkout:
 *
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --list
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --purpose marketing-site
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --component stat --component meter
 *
 * Options:
 *   --list                 One line per Component: slug, name, Group, purposes, terminal stance.
 *   --purpose <id>         Components enrolled in one purpose collection (repeatable).
 *   --group <Group>        Components in one Group (repeatable).
 *   --component <slug>     One Component by slug (repeatable).
 *   --package <specifier>  Package root or explicit ./components entrypoint.
 *                          Default: the project's `@discern-sh/design-system`
 *                          package, then the latest JSR release.
 *   --help                 This text.
 *
 * Filters combine as a union. Without a filter the complete guide prints.
 * The resolved specifier is reported on stderr so stdout stays capturable.
 */

interface GuideMetadata {
  readonly name: string;
  readonly slug: string;
  readonly group: string;
  readonly purposes?: readonly string[];
  readonly cli: { readonly stance: string };
}

interface GuidePackage {
  readonly componentAuthorGuide?: unknown;
  readonly componentMetadata?: unknown;
}

interface Options {
  readonly list: boolean;
  readonly help: boolean;
  readonly purposes: readonly string[];
  readonly groups: readonly string[];
  readonly components: readonly string[];
  readonly specifier?: string;
}

const DEFAULT_SPECIFIERS = [
  "@discern-sh/design-system",
  "jsr:@discern-sh/design-system",
] as const;

/** Resolve a package root to its Component-guide entrypoint. */
export function componentEntrypoint(specifier: string): string {
  const trimmed = specifier.replace(/\/+$/u, "");
  return trimmed.endsWith("/components") ||
      /\.[cm]?[jt]sx?$/u.test(trimmed)
    ? trimmed
    : `${trimmed}/components`;
}

function usage(): string {
  const doc = Deno.readTextFileSync(new URL(import.meta.url));
  const comment = doc.slice(doc.indexOf("/**") + 3, doc.indexOf("*/"));
  return comment.split("\n").map((line) => line.replace(/^ \* ?/u, ""))
    .join("\n").trim();
}

function parseOptions(args: readonly string[]): Options {
  const purposes: string[] = [];
  const groups: string[] = [];
  const components: string[] = [];
  let list = false;
  let help = false;
  let specifier: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = () => {
      const next = args[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`${argument} needs a value`);
      }
      index += 1;
      return next;
    };
    switch (argument) {
      case "--list":
        list = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      case "--purpose":
        purposes.push(value());
        break;
      case "--group":
        groups.push(value());
        break;
      case "--component":
        components.push(value());
        break;
      case "--package":
        specifier = value();
        break;
      default:
        throw new Error(`Unknown option ${argument}; run with --help`);
    }
  }
  return specifier === undefined
    ? { list, help, purposes, groups, components }
    : { list, help, purposes, groups, components, specifier };
}

async function loadPackage(
  requested: string | undefined,
): Promise<{ readonly module: GuidePackage; readonly specifier: string }> {
  const candidates = requested === undefined ? DEFAULT_SPECIFIERS : [requested];
  const failures: string[] = [];
  for (const candidate of candidates) {
    const entrypoint = componentEntrypoint(candidate);
    try {
      const module = await import(entrypoint) as GuidePackage;
      return { module, specifier: entrypoint };
    } catch (error) {
      failures.push(
        `  ${entrypoint}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  const hint = failures.some((failure) => failure.includes("read access"))
    ? "Run with --allow-read: a dynamically imported local checkout needs read permission."
    : "Run with --config <project deno.json> so the package resolves, pass --package <package-root-or-components-entrypoint>, or author from the installed version's README if it predates ./components.";
  throw new Error(
    `Could not import the design system package:\n${
      failures.join("\n")
    }\n${hint}`,
  );
}

function guideFacts(
  module: GuidePackage,
  specifier: string,
): { readonly guide: string; readonly metadata: readonly GuideMetadata[] } {
  const { componentAuthorGuide, componentMetadata } = module;
  if (
    typeof componentAuthorGuide !== "string" ||
    !Array.isArray(componentMetadata)
  ) {
    throw new Error(
      `${specifier} does not export componentAuthorGuide and componentMetadata. Author from that installed version's README, or ask for authority to upgrade the dependency; never consult a newer package than the one the code will run against.`,
    );
  }
  return {
    guide: componentAuthorGuide,
    metadata: componentMetadata as readonly GuideMetadata[],
  };
}

/** Component sections keyed by slug, in guide order. */
function componentSections(guide: string): ReadonlyMap<string, string> {
  const sections = new Map<string, string>();
  for (const chunk of guide.split(/^(?=## )/mu)) {
    const [, ...components] = chunk.split(/^(?=### )/mu);
    for (const section of components) {
      const slug = section.match(/^### .* \(`([^`]+)`\)/u)?.[1];
      if (slug !== undefined) sections.set(slug, section.trimEnd());
    }
  }
  return sections;
}

function rejectUnknown(
  label: string,
  requested: readonly string[],
  known: readonly string[],
): void {
  const unknown = requested.filter((value) => !known.includes(value));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown ${label} ${unknown.join(", ")}. Known: ${known.join(", ")}`,
    );
  }
}

function selectSlugs(
  options: Options,
  metadata: readonly GuideMetadata[],
): readonly string[] {
  const purposes = [
    ...new Set(metadata.flatMap((meta) => meta.purposes ?? [])),
  ];
  const groups = [...new Set(metadata.map((meta) => meta.group))];
  rejectUnknown("purpose", options.purposes, purposes);
  rejectUnknown("Group", options.groups, groups);
  rejectUnknown("Component", options.components, metadata.map((m) => m.slug));
  return metadata.filter((meta) =>
    options.components.includes(meta.slug) ||
    options.groups.includes(meta.group) ||
    (meta.purposes ?? []).some((purpose) => options.purposes.includes(purpose))
  ).map((meta) => meta.slug);
}

async function main(args: readonly string[]): Promise<number> {
  const options = parseOptions(args);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const { module, specifier } = await loadPackage(options.specifier);
  const { guide, metadata } = guideFacts(module, specifier);
  console.error(`Component author guide from ${specifier}`);
  if (options.list) {
    for (const meta of metadata) {
      console.log(
        [
          meta.slug,
          meta.name,
          meta.group,
          (meta.purposes ?? []).join(",") || "-",
          meta.cli.stance,
        ].join("\t"),
      );
    }
    return 0;
  }
  const filtered = options.purposes.length + options.groups.length +
      options.components.length > 0;
  if (!filtered) {
    console.log(guide.trimEnd());
    return 0;
  }
  const slugs = selectSlugs(options, metadata);
  const sections = componentSections(guide);
  const filters = [
    ...options.purposes.map((purpose) => `purpose ${purpose}`),
    ...options.groups.map((group) => `Group ${group}`),
    ...options.components.map((slug) => `Component ${slug}`),
  ].join(", ");
  console.log(
    `${slugs.length} of ${metadata.length} Components match ${filters}.\n`,
  );
  console.log(
    slugs.map((slug) => sections.get(slug) ?? `### ${slug}\n\n(no section)`)
      .join("\n\n"),
  );
  return 0;
}

if (import.meta.main) {
  try {
    Deno.exit(await main(Deno.args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(2);
  }
}
