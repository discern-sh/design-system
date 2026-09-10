/**
 * Print the installed `@discern-sh/design-system` author guides, whole or
 * filtered, so an agent loads only the sections its task needs.
 *
 * Run it from the consumer project with that project's config, so the
 * project's own package alias and pinned version resolve. The package is
 * imported dynamically, which needs read permission when it resolves to a
 * local checkout (and to read the project's deno.json for its alias):
 *
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --list
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --purpose marketing-site
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --component stat --component meter
 *   deno run --allow-read --config deno.json <skill>/scripts/component-guide.ts --diagram-kinds
 *
 * Options:
 *   --list                 One line per Component: slug, name, Group, purposes, terminal stance.
 *   --purpose <id>         Components enrolled in one purpose collection (repeatable).
 *   --group <Group>        Components in one Group (repeatable).
 *   --component <slug>     One Component by slug (repeatable); each section ends
 *                          with the adapter's documented props.
 *   --diagram-kinds        The diagram kind guide: budgets, wrapping measures, extent.
 *   --chart-kinds          The chart kind guide: budgets, honesty tiers, refused forms.
 *   --package <specifier>  Package root or explicit ./components entrypoint.
 *                          Default: the project's `@discern-sh/design-system`
 *                          package, then any alias its deno.json maps to the
 *                          package, then the latest JSR release.
 *   --help                 This text.
 *
 * Filters combine as a union. Without a filter the complete Component guide
 * prints. The resolved specifier, its resolution route, and the package
 * version are reported on stderr so stdout stays capturable.
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
  readonly packageVersion?: unknown;
}

type KindFamily = "diagram" | "chart";

interface Options {
  readonly list: boolean;
  readonly help: boolean;
  readonly purposes: readonly string[];
  readonly groups: readonly string[];
  readonly components: readonly string[];
  readonly kinds: readonly KindFamily[];
  readonly specifier?: string;
}

const PACKAGE_NAME = "@discern-sh/design-system";
const LATEST_SPECIFIER = `jsr:${PACKAGE_NAME}`;

/** How the package was found, reported beside the resolved specifier. */
export type ResolutionRoute = "explicit" | "mapped" | "alias" | "latest";

/** Resolve a package root to its Component-guide entrypoint. */
export function componentEntrypoint(specifier: string): string {
  const trimmed = specifier.replace(/\/+$/u, "");
  return trimmed.endsWith("/components") ||
      /\.[cm]?[jt]sx?$/u.test(trimmed)
    ? trimmed
    : `${trimmed}/components`;
}

/**
 * Resolve the kind-guide entrypoint beside a Component entrypoint. Only a
 * package root or `<root>/components` can name it; an explicit module file
 * has no sibling the script can derive.
 */
export function kindGuideEntrypoint(
  componentSpecifier: string,
  family: KindFamily,
): string {
  const trimmed = componentSpecifier.replace(/\/+$/u, "");
  if (trimmed.endsWith("/components")) {
    return `${trimmed.slice(0, -"/components".length)}/${family}`;
  }
  if (/\.[cm]?[jt]sx?$/u.test(trimmed)) {
    throw new Error(
      `${trimmed} is an explicit module, so the ${family} kind guide beside it cannot be derived; pass --package <package-root> instead`,
    );
  }
  return `${trimmed}/${family}`;
}

/**
 * The Component entrypoint a project's import map reaches the package
 * under, when it aliases the package by another name: either a bare alias
 * mapped to the JSR package, or an explicit `<alias>/components` mapped to
 * the package's Component Metadata module.
 */
export function detectPackageAlias(
  imports: Readonly<Record<string, unknown>>,
): string | undefined {
  for (const [key, value] of Object.entries(imports)) {
    if (typeof value !== "string" || key === PACKAGE_NAME) continue;
    if (
      key.endsWith("/components") &&
      /component-metadata\.[cm]?[jt]s$/u.test(value)
    ) {
      return key;
    }
    if (
      !key.includes("/") &&
      (value === LATEST_SPECIFIER || value.startsWith(`${LATEST_SPECIFIER}@`) ||
        value.startsWith(`${LATEST_SPECIFIER}/`))
    ) {
      return `${key}/components`;
    }
  }
  return undefined;
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
  const kinds: KindFamily[] = [];
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
      case "--diagram-kinds":
        kinds.push("diagram");
        break;
      case "--chart-kinds":
        kinds.push("chart");
        break;
      case "--package":
        specifier = value();
        break;
      default:
        throw new Error(`Unknown option ${argument}; run with --help`);
    }
  }
  return specifier === undefined
    ? { list, help, purposes, groups, components, kinds }
    : { list, help, purposes, groups, components, kinds, specifier };
}

async function projectAlias(): Promise<string | undefined> {
  try {
    const config = JSON.parse(await Deno.readTextFile("deno.json")) as {
      readonly imports?: Readonly<Record<string, unknown>>;
    };
    return detectPackageAlias(config.imports ?? {});
  } catch {
    return undefined;
  }
}

function resolved(specifier: string): string {
  try {
    return import.meta.resolve(specifier);
  } catch {
    return specifier;
  }
}

interface LoadedPackage {
  readonly module: GuidePackage;
  readonly specifier: string;
  readonly route: ResolutionRoute;
  /** Why each earlier candidate failed, so a fallback explains itself. */
  readonly skipped: readonly string[];
}

async function loadPackage(
  requested: string | undefined,
): Promise<LoadedPackage> {
  const candidates: readonly { specifier: string; route: ResolutionRoute }[] =
    requested === undefined
      ? [
        { specifier: PACKAGE_NAME, route: "mapped" },
        ...(await projectAlias().then((alias) =>
          alias === undefined
            ? []
            : [{ specifier: alias, route: "alias" as const }]
        )),
        { specifier: LATEST_SPECIFIER, route: "latest" },
      ]
      : [{ specifier: requested, route: "explicit" }];
  const failures: string[] = [];
  for (const candidate of candidates) {
    const entrypoint = componentEntrypoint(candidate.specifier);
    try {
      const module = await import(entrypoint) as GuidePackage;
      return {
        module,
        specifier: entrypoint,
        route: candidate.route,
        skipped: failures,
      };
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

/** One stderr line naming what was read, how it resolved, and which version. */
function reportSource(loaded: LoadedPackage): void {
  const target = resolved(loaded.specifier);
  const version = typeof loaded.module.packageVersion === "string"
    ? loaded.module.packageVersion
    : "version predates packageVersion; read it from deno.lock";
  const route = {
    explicit: "explicit --package",
    mapped: "the project's @discern-sh/design-system mapping",
    alias: "the project's alias for the package",
    latest:
      "the latest JSR release, not the project's dependency; pass --package to pin",
  }[loaded.route];
  const arrow = target === loaded.specifier ? "" : ` → ${target}`;
  console.error(
    `Component author guide from ${loaded.specifier}${arrow} (${version}; via ${route})`,
  );
  if (loaded.route === "latest" && loaded.skipped.length > 0) {
    console.error(
      `The project's own package could not be imported:\n${
        loaded.skipped.join("\n")
      }`,
    );
  }
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

async function printKindGuide(
  componentSpecifier: string,
  family: KindFamily,
): Promise<void> {
  const entrypoint = kindGuideEntrypoint(componentSpecifier, family);
  const module = await import(entrypoint) as Readonly<Record<string, unknown>>;
  const guide = module[`${family}KindAuthorGuide`];
  if (typeof guide !== "string") {
    throw new Error(
      `${entrypoint} does not export ${family}KindAuthorGuide; that installed version predates the ${family} kind guide.`,
    );
  }
  console.error(`${family} kind guide from ${entrypoint}`);
  console.log(guide.trimEnd());
}

async function main(args: readonly string[]): Promise<number> {
  const options = parseOptions(args);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const loaded = await loadPackage(options.specifier);
  const { guide, metadata } = guideFacts(loaded.module, loaded.specifier);
  reportSource(loaded);
  const filtered = options.purposes.length + options.groups.length +
      options.components.length > 0;
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
  } else if (filtered) {
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
  } else if (options.kinds.length === 0) {
    console.log(guide.trimEnd());
  }
  for (const family of [...new Set(options.kinds)]) {
    if (options.list || filtered) console.log("");
    await printKindGuide(loaded.specifier, family);
  }
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
