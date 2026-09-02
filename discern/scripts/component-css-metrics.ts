import { fromFileUrl, relative } from "@std/path";

const packageRoot = fromFileUrl(new URL("../../", import.meta.url));
const componentRoot = fromFileUrl(
  new URL("../../src/components/", import.meta.url),
);

/** One authored CSS declaration, with its stable repository location. */
export interface CssDeclaration {
  readonly file: string;
  readonly line: number;
  readonly property: string;
  readonly value: string;
}

/** One declaration admitted by a Component CSS measure. */
export interface ComponentCssHit extends CssDeclaration {
  readonly reason: string;
}

function maskComments(source: string): string {
  return source.replace(
    /\/\*[\s\S]*?\*\//gu,
    (comment) => comment.replace(/[^\n]/gu, " "),
  );
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor++) {
    if (source[cursor] === "\n") line += 1;
  }
  return line;
}

/** Parse declarations without accepting selector or at-rule colons as values. */
export function cssDeclarations(
  source: string,
  file = "fixture.css",
): readonly CssDeclaration[] {
  const css = maskComments(source);
  const declarations: CssDeclaration[] = [];
  const pattern =
    /(?:^|(?<=[;{]))\s*([-_a-zA-Z][-_a-zA-Z0-9]*)\s*:\s*([^;{}]*);/gmu;
  for (const match of css.matchAll(pattern)) {
    const property = match[1];
    const value = match[2];
    if (
      property === undefined || value === undefined || match.index === undefined
    ) {
      continue;
    }
    const propertyIndex = match.index + match[0].indexOf(property);
    declarations.push({
      file,
      line: lineAt(css, propertyIndex),
      property: property.toLowerCase(),
      value: value.trim(),
    });
  }
  return declarations;
}

async function cssFiles(directory: string): Promise<readonly string[]> {
  const files: string[] = [];
  const entries = [...Deno.readDirSync(directory)].toSorted((left, right) =>
    left.name.localeCompare(right.name)
  );
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) files.push(...await cssFiles(path));
    else if (entry.isFile && entry.name.endsWith(".css")) files.push(path);
  }
  return files;
}

/** Run one pure declaration detector over every authored Component stylesheet. */
export async function componentCssHits(
  detect: (
    declarations: readonly CssDeclaration[],
  ) => readonly ComponentCssHit[],
): Promise<readonly ComponentCssHit[]> {
  const hits: ComponentCssHit[] = [];
  for (const path of await cssFiles(componentRoot)) {
    const file = relative(packageRoot, path);
    const declarations = cssDeclarations(await Deno.readTextFile(path), file);
    hits.push(...detect(declarations));
  }
  return hits;
}

/** Print a stable work list followed by the one metric line discern consumes. */
export function printComponentCssMetric(
  name: string,
  hits: readonly ComponentCssHit[],
  verbose: boolean,
): void {
  if (verbose) {
    for (const hit of hits) {
      console.log(
        `${hit.file}:${hit.line}: ${hit.property}: ${hit.value} (${hit.reason})`,
      );
    }
  }
  console.log(`DISCERN_METRIC ${name} ${hits.length}`);
}

/** Accept either the ordinary census or its stable verbose work list. */
export function verboseMetricRequested(args: readonly string[]): boolean {
  if (args.length === 0) return false;
  if (args.length === 1 && args[0] === "--verbose") return true;
  throw new TypeError("The only supported option is --verbose");
}
