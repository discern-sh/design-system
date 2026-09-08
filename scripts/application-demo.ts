/** Run the generic owned-terminal application review. */
import {
  InteractionCancelled,
  runTerminalApplication,
} from "@discern-sh/design-system/cli/interactive";
import { applicationDemoOptions } from "./playground/application.ts";

try {
  await runTerminalApplication(
    applicationDemoOptions(async () => {
      const child = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          new URL("./playground/application-child.ts", import.meta.url)
            .pathname,
        ],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }).spawn();
      if (!(await child.status).success) {
        throw new Error("Sample child failed.");
      }
    }),
    {
      theme: Deno.args.includes("--light") ? "light" : "dark",
      appearance: { accent: 220 },
    },
  );
} catch (error) {
  if (!(error instanceof InteractionCancelled)) throw error;
}
