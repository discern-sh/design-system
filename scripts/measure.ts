// Measures the consumer-facing docs-selection budget: the bytes a
// documentation site receives from `groups: ["Docs"]`. Run by the
// docs_selection standard in discern.toml.
import { toFileUrl } from "@std/path";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const temp = await Deno.makeTempDir();
try {
  await emitDesignSystemRuntime({
    outputRoot: toFileUrl(`${temp}/`),
    groups: ["Docs"],
  });
  const bytes = (await Deno.stat(`${temp}/discern.css`)).size;
  console.log(`DISCERN_METRIC docs_selection_bytes ${bytes}`);
} finally {
  await Deno.remove(temp, { recursive: true });
}
