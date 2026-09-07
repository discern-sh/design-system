import { assertEquals } from "@std/assert";

Deno.test("checkout preparation follows the current source and stops on either failed phase", async () => {
  const root = await Deno.makeTempDir({ prefix: "design-system checkout " });
  try {
    await Deno.mkdir(`${root}/discern/scripts`, { recursive: true });
    await Deno.mkdir(`${root}/bin`);
    await Deno.copyFile(
      new URL("../discern/scripts/prepare-checkout", import.meta.url),
      `${root}/discern/scripts/prepare-checkout`,
    );
    await Deno.writeTextFile(
      `${root}/bin/deno`,
      `#!/bin/sh
set -eu
printf '%s:%s\\n' "$(cat source)" "$*" >> calls
case "$1" in
  install) test "$(cat failure)" != install ;;
  task) test "$(cat failure)" != build ;;
  *) exit 99 ;;
esac
`,
    );
    await Deno.chmod(`${root}/bin/deno`, 0o755);
    for (
      const [source, failure, expectedCode, expectedCalls] of [
        ["candidate", "none", 0, "install --frozen|task build"],
        ["source", "none", 0, "install --frozen|task build"],
        ["source", "install", 1, "install --frozen"],
        ["source", "build", 1, "install --frozen|task build"],
      ] as const
    ) {
      await Deno.writeTextFile(`${root}/source`, source);
      await Deno.writeTextFile(`${root}/failure`, failure);
      await Deno.writeTextFile(`${root}/calls`, "");
      const result = await new Deno.Command("sh", {
        args: [`${root}/discern/scripts/prepare-checkout`],
        cwd: root + "/bin",
        env: { PATH: `${root}/bin:${Deno.env.get("PATH") ?? "/usr/bin:/bin"}` },
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        result.code,
        expectedCode,
        new TextDecoder().decode(result.stderr),
      );
      assertEquals(
        await Deno.readTextFile(`${root}/calls`),
        expectedCalls.split("|").map((call) => `${source}:${call}\n`).join(""),
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
