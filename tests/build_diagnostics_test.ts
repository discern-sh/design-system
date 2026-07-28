import { assertThrows } from "@std/assert";
import { assertKnownDocWarnings } from "../scripts/build.ts";

const knownWarning =
  "Warning Failed resolving types. Could not find package 'global.d.ts'";

Deno.test("known deno doc warnings are independent of terminal styling", () => {
  assertKnownDocWarnings(
    `${knownWarning} from referrer 'file:///component.tsx'.`,
  );
  assertKnownDocWarnings(
    `\u001b[0m\u001b[33mWarning\u001b[0m Failed resolving types. ` +
      `Could not find package 'global.d.ts' from referrer ` +
      `'\u001b[36mfile:///component.tsx\u001b[0m'.`,
  );
});

Deno.test("terminal styling cannot disguise additional deno doc warnings", () => {
  assertThrows(
    () =>
      assertKnownDocWarnings(
        `${knownWarning} from referrer 'file:///component.tsx'.\n` +
          `\u001b[1;33mWarning\u001b[0m A future unrelated warning.`,
      ),
    Error,
    "deno doc emitted an unexpected warning",
  );
});

Deno.test("terminal styling cannot disguise an unexpected deno doc warning", () => {
  assertThrows(
    () =>
      assertKnownDocWarnings(
        "\u001b[33mWarning\u001b[0m A future unrelated warning.",
      ),
    Error,
    "deno doc emitted an unexpected warning",
  );
});
