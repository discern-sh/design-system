import { InteractionCancelled } from "../src/cli/interactive/mod.ts";
import { guidedSetupForm } from "../scripts/playground/guided-flow.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  guidedSetupActions,
  replayGuidedSetup,
} from "../catalogue/guided-flow.ts";
import { defaultCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";
import { stripAnsi } from "../src/cli/ansi.ts";
import { FakeTerminalIO } from "../src/cli/interactive/testing.ts";
import {
  inspectTerminalLayout,
  projectTerminalInlineHtml,
} from "../src/cli/projection.ts";

Deno.test("guided replay and live requests preserve the same complete semantic journey", async () => {
  for (const columns of [40, 80, 120]) {
    for (const rows of [16, 24, 40]) {
      for (const unicode of [true, false]) {
        for (
          const colorDepth of [
            "none",
            "ansi16",
            "ansi256",
            "truecolor",
          ] as const
        ) {
          for (const outcome of ["completion", "cancellation"] as const) {
            const capabilities = {
              ansiControl: true,
              columns,
              unicode,
              colorDepth,
            };
            const replay = await replayGuidedSetup(
              capabilities,
              defaultCatalogueTerminalPresentation,
              rows,
              outcome,
            );
            assertEquals(replay.cancelled, outcome === "cancellation");
            assertEquals(
              replay.values,
              outcome === "completion"
                ? {
                  name: "Maple",
                  delivery: "email",
                  address: "team@example.test",
                  confirmed: true,
                }
                : undefined,
            );
            assertEquals(replay.frames.length, 8);
            assertStringIncludes(
              stripAnsi(replay.frames[1]!.output),
              "Enter a workspace name.",
            );
            assertStringIncludes(
              stripAnsi(replay.frames[5]!.output),
              "team@example.test",
            );
            const final = stripAnsi(replay.frames.at(-1)!.output);
            assertStringIncludes(final, "Maple");
            assertStringIncludes(final, "team@example.test");
            assertStringIncludes(
              final,
              outcome === "completion" ? "Confirmed" : "Dismissed.",
            );
            for (const frame of replay.frames) {
              assert(frame.output !== "");
              projectTerminalInlineHtml(frame.output);
              assertEquals(
                inspectTerminalLayout(frame.output, { columns, rows })
                  .overflowRows,
                [],
              );
              if (!unicode) {
                assert(
                  [...stripAnsi(frame.output)].every((char) =>
                    char.codePointAt(0)! <= 127
                  ),
                );
              }
            }
            {
              const io = new FakeTerminalIO([
                ...guidedSetupActions.map(({ input }) => input),
                outcome === "completion" ? "\r" : "\x1b",
              ], { ...capabilities, rows });
              const form = guidedSetupForm({
                io,
                ...defaultCatalogueTerminalPresentation,
              });
              if (outcome === "completion") {
                assertEquals(await form.submit(), replay.values);
              } else {await assertRejects(
                  () => form.submit(),
                  InteractionCancelled,
                  "Dismissed.",
                );}
              let cursor = 0;
              for (const frame of replay.frames) {
                const at = io.output().indexOf(frame.output, cursor);
                assert(
                  at >= cursor,
                  `${columns}/${rows}/${unicode}/${colorDepth}/${outcome}: ${frame.label} differed from the live adapter or appeared out of order`,
                );
                cursor = at + frame.output.length;
              }
              assertEquals(io.rawTransitions.at(-1), false);
            }
          }
        }
      }
    }
  }
});
