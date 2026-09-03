import { assert } from "@std/assert";
import { fromFileUrl, join } from "@std/path";

/** Absolute package root shared by tracked-source architecture tests. */
export const PACKAGE_ROOT = fromFileUrl(new URL("../../", import.meta.url));

/** One tracked or newly authored TypeScript source in the current checkout. */
export interface TypeScriptSource {
  readonly path: string;
  readonly source: string;
}

/** Load every tracked or unignored new TypeScript container in the checkout. */
export async function trackedTypeScriptSources(): Promise<
  readonly TypeScriptSource[]
> {
  const result = await new Deno.Command("git", {
    args: [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "*.ts",
      "*.tsx",
    ],
    cwd: PACKAGE_ROOT,
    stderr: "piped",
    stdout: "piped",
  }).output();
  assert(result.success, new TextDecoder().decode(result.stderr));
  const paths = new TextDecoder().decode(result.stdout).split("\0").filter(
    Boolean,
  );
  return await Promise.all(paths.map(async (path) => ({
    path,
    source: await Deno.readTextFile(join(PACKAGE_ROOT, path)),
  })));
}
