/**
 * Internal convenience for the maintainer: generate the files of the Claude
 * Design "Design System" artifact that mirrors this package — tokens, brand
 * book, fonts, component cards, the React adapter bundle, and the cover — into
 * an ignored output directory, ready for an agent to publish with its Artifact
 * tool. Nothing here is part of the published package or its documentation.
 *
 * Run from the project root:
 *
 *     discern scripts design-system-artifact [--out <dir>] [--index] [--no-bundle]
 *
 * `--out` chooses the output directory (default `dist/design-system-artifact/`,
 * replaced on every run); `--index` also writes a fresh `design-system.json`
 * for a system that does not exist yet; `--no-bundle` skips the adapter bundle.
 */
import { fromFileUrl } from "@std/path";
import {
  componentMetadata,
  packageVersion,
} from "../../src/component-metadata.ts";
import { emitDesignSystemRuntime } from "../../src/runtime.ts";
import { buildBundle } from "./bundle.ts";
import { renderComponentCards } from "./components.ts";
import { coverDocument } from "./cover.ts";
import { copyFile, writeText } from "./support.ts";
import {
  buildTokens,
  colourRoleCount,
  fontFamilies,
  fontFiles,
} from "./tokens.ts";

const ROOT = new URL("../../", import.meta.url);
const TAGLINE = "Paper, ink, one hard shadow, and a witness beyond colour.";
const TEXTURE = { source: "assets/textures/grain.png", name: "grain.png" };

interface Options {
  readonly out: URL;
  readonly index: boolean;
  readonly bundle: boolean;
}

function parseOptions(args: readonly string[]): Options {
  let out = "dist/design-system-artifact/";
  let index = false;
  let bundle = true;
  for (let position = 0; position < args.length; position += 1) {
    const arg = args[position];
    if (arg === "--out") {
      position += 1;
      const value = args[position];
      if (value === undefined) throw new Error("--out needs a directory");
      out = value;
    } else if (arg === "--index") index = true;
    else if (arg === "--no-bundle") bundle = false;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: discern scripts design-system-artifact [--out <dir>] [--index] [--no-bundle]",
      );
      Deno.exit(0);
    } else throw new Error(`Unknown argument ${arg}`);
  }
  const base = new URL(`file://${Deno.cwd()}/`);
  return {
    out: new URL(out.endsWith("/") ? out : `${out}/`, base),
    index,
    bundle,
  };
}

async function git(...args: string[]): Promise<string> {
  const result = await new Deno.Command("git", {
    args,
    cwd: fromFileUrl(ROOT),
    stdout: "piped",
    stderr: "null",
  }).output();
  if (!result.success) throw new Error(`git ${args.join(" ")} failed`);
  return new TextDecoder().decode(result.stdout).trim();
}

async function stylesheet(runtimeCss: string): Promise<string> {
  const families = Object.entries(fontFamilies).map(([role, stack]) =>
    `    --discern-font-${role}: ${stack};`
  ).join("\n");
  return `${runtimeCss}
/* ---- Font pack. The artifact's tokens.css declares @font-face for ${
    [...new Set(fontFiles.map((font) => font.family))].join(", ")
  } (fonts/); these stacks select them, as assets/fonts.css does in the package. */
@layer discern.tokens {
  :where([data-discern-root]) {
${families}
  }
}
/* ---- Catalogue example helpers used by the canonical examples the previews render. */
@layer discern.utilities {
${await exampleHelpers()}
}
`;
}

/** The example-only helper classes the canonical examples compose with. */
async function exampleHelpers(): Promise<string> {
  const source = await Deno.readTextFile(
    new URL("catalogue/styles/components.css", ROOT),
  );
  const rules: string[] = [];
  const rule = /^ {2}(\.discern-example-[^{]+)\{([^}]*)\}/gm;
  let match: RegExpExecArray | null;
  while ((match = rule.exec(source))) {
    const selector = (match[1] ?? "").trim();
    const body = (match[2] ?? "").replace(/\s+/g, " ").trim();
    rules.push(`  ${selector} { ${body} }`);
  }
  if (rules.length === 0) {
    throw new Error(
      "No .discern-example-* helper rules found in the Catalogue styles",
    );
  }
  return rules.join("\n");
}

function notSynced(ref: string, cards: number): string {
  const total = componentMetadata.length;
  return `## Not synced

Built from \`discern-sh/design-system\` at \`${ref}\` (v${packageVersion}). Not carried: the two per-theme presentation tokens \`--discern-brand-artwork-opacity\` (1 light, 0 dark) and \`--discern-backdrop-theme-gain\` (1 light, 0.78 dark); the feature-bound \`Discern Inter UI\` and \`Discern Inter Marketing\` faces and the metric-adjusted Georgia, Helvetica, and Arial fallback aliases from \`assets/fonts.css\` (the same \`inter.woff2\` ships here as plain Inter); the appearance scopes stylesheet and the \`discern.js\` behaviour script (tooltips, hover cards, copy buttons, the theme toggle, and the docs drawer show their static fallbacks). Components took the built route: \`components/bundle.js\` is the whole React adapter (\`src/react.ts\`, all ${total} components) bundled as one script on React 18, while the previews are the package's canonical examples rendered to static HTML through that same adapter. ${cards} components have cards; the remaining ${
    total - cards
  } are in the bundle and typed in \`components/index.d.ts\` but have no card here.
`;
}

async function main(): Promise<void> {
  const options = parseOptions(Deno.args);
  const out = options.out;
  const project = new URL("project/", out);
  await Deno.remove(out, { recursive: true }).catch(() => undefined);
  await Deno.mkdir(project, { recursive: true });
  console.log(`design-system-artifact → ${fromFileUrl(out)}`);

  const ref = `${await git("rev-parse", "--abbrev-ref", "HEAD")}@${await git(
    "rev-parse",
    "--short",
    "HEAD",
  )}`;
  const now = new Date();
  const synced = now.toISOString().slice(0, 10);

  const runtime = await emitDesignSystemRuntime({
    outputRoot: new URL("runtime/", out),
    all: true,
  });
  const runtimeCss = await Deno.readTextFile(
    new URL("runtime/discern.css", out),
  );
  console.log(
    `runtime: ${runtime.components} components, ${runtime.tokens} tokens`,
  );

  const cards = await renderComponentCards(ROOT, out);
  console.log(`cards: ${cards.length}`);

  await writeText(
    new URL("tokens.json", project),
    `${
      JSON.stringify(
        buildTokens({
          ref,
          synced,
          components: Object.fromEntries(
            cards.map((card) => [card.folder, card.sourcePath]),
          ),
        }),
        null,
        2,
      )
    }\n`,
  );
  console.log(`tokens.json: ${colourRoleCount()} colour roles`);

  if (options.bundle) {
    const bytes = await buildBundle(
      ROOT,
      out,
      cards.map((card) => card.reactName),
    );
    console.log(`bundle.js: ${bytes} bytes`);
  }
  await writeText(
    new URL("components/bundle.css", project),
    await stylesheet(runtimeCss),
  );

  const here = new URL("./", import.meta.url);
  const brandBook = await Deno.readTextFile(new URL("brand-book.md", here));
  await writeText(
    new URL("README.md", project),
    `${brandBook.trimEnd()}\n\n${notSynced(ref, cards.length)}`,
  );
  await writeText(
    new URL("components/Cover/preview.html", project),
    coverDocument(TAGLINE),
  );

  for (const font of fontFiles) {
    await copyFile(
      new URL(`assets/fonts/${font.source}`, ROOT),
      new URL(`fonts/${font.source}`, project),
    );
  }
  for await (const entry of Deno.readDir(new URL("assets/licenses/", ROOT))) {
    if (entry.isFile && entry.name.endsWith(".txt")) {
      await copyFile(
        new URL(`assets/licenses/${entry.name}`, ROOT),
        new URL(`assets/Licenses/${entry.name}`, project),
      );
    }
  }
  await copyFile(
    new URL("licences-readme.md", here),
    new URL("assets/Licenses/README.md", project),
  );
  await copyFile(
    new URL("textures-readme.md", here),
    new URL("assets/Textures/README.md", project),
  );
  await copyFile(
    new URL(TEXTURE.source, ROOT),
    new URL(`uploads/${TEXTURE.name}`, out),
  );
  const textureSize =
    (await Deno.stat(new URL(`uploads/${TEXTURE.name}`, out))).size;

  const index = {
    v: 3,
    layout: "files",
    createdOnFiles: { v: 1, at: now.toISOString() },
    title: "discern",
    namespace: "Discern",
    libraries: [{ name: "react", version: "18" }, {
      name: "react-dom",
      version: "18",
    }],
    sections: {},
    groups: ["Textures", "Licenses"],
    assetGroups: {
      Textures: {
        name: "Textures",
        tile: "m",
        order: [TEXTURE.name],
        files: {
          [TEXTURE.name]: {
            name: TEXTURE.name,
            blob: "<id returned by uploading uploads/grain.png>",
            size: textureSize,
            type: "image/png",
          },
        },
      },
      Licenses: { name: "Licenses", tile: "s", order: [], files: {} },
    },
    blobs: {},
    docs: { readme: "project/README.md", sections: [] },
    lastChange: {
      by: "<owner>",
      at: now.toISOString(),
      via: `Claude Code · GitHub · discern-sh/design-system@${ref}`,
      note:
        `Generated from ${ref} (v${packageVersion}): ${colourRoleCount()} colour roles in four themes, type, spacing, radii, shadows, ${fontFiles.length} fonts, and ${cards.length} component cards.`,
    },
  };
  const indexText = `${JSON.stringify(index, null, 2)}\n`;
  await writeText(new URL("index.template.json", out), indexText);
  if (options.index) {
    await writeText(new URL("design-system.json", project), indexText);
  }

  const files: Record<string, unknown> = {};
  const walk = async (directory: URL, prefix: string): Promise<void> => {
    const names: { name: string; isDirectory: boolean }[] = [];
    for await (const entry of Deno.readDir(directory)) names.push(entry);
    for (const entry of names.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory) {
        await walk(new URL(`${entry.name}/`, directory), `${path}/`);
      } else if (path === "project/design-system.json") continue;
      else if (path.endsWith(".ts")) {
        files[path] = { from: path, contentType: "text/plain" };
      } else files[path] = path;
    }
  };
  await walk(project, "project/");
  await writeText(
    new URL("publish.json", out),
    `${
      JSON.stringify(
        {
          root: fromFileUrl(out),
          index: options.index
            ? fromFileUrl(new URL("design-system.json", project))
            : null,
          uploads: [{
            file: fromFileUrl(new URL(`uploads/${TEXTURE.name}`, out)),
            group: "Textures",
            name: TEXTURE.name,
          }],
          files,
        },
        null,
        2,
      )
    }\n`,
  );
  console.log(`files: ${Object.keys(files).length} under project/`);
  console.log(
    `next: upload uploads/${TEXTURE.name} as an asset, put its id in ${
      options.index ? "project/design-system.json" : "the live index"
    }, then publish publish.json's files in one call (root, file_path, files).`,
  );
}

if (import.meta.main) await main();
