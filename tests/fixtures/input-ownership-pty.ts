/** Native stdin ownership canary using the public runtime and demonstration. */
import {
  DenoTerminalIO,
  InteractionCancelled,
  runTerminalApplication,
  type TerminalApplicationContext,
} from "@discern-sh/design-system/cli/interactive";
import { applicationDemoOptions } from "../../scripts/playground/application.ts";

const mode = Deno.args[0];
if (mode !== "escape" && mode !== "abort" && mode !== "provider") {
  throw new Error("expected an ownership test mode");
}
const abort = new AbortController();
let context: TerminalApplicationContext<string> | undefined;
let injected = false;
let cancellations = 0;
class OwnershipProbe extends DenoTerminalIO {
  override read(): Promise<Uint8Array | null> {
    const pending = super.read();
    if (mode !== "escape" && !injected) {
      injected = true;
      queueMicrotask(() => {
        if (mode === "abort") abort.abort();
        else context!.fail(new Error("sample provider failed"));
      });
    }
    return pending;
  }
  override cancelRead(): boolean {
    const cancelled = super.cancelRead();
    if (cancelled) cancellations++;
    return cancelled;
  }
}
const io = new OwnershipProbe({ readBufferSize: 1 });
const demo = applicationDemoOptions(() => {});
try {
  await runTerminalApplication({
    ...demo,
    start: (value) => {
      context = value;
      return demo.start?.(value);
    },
  }, { io, abortSignal: abort.signal });
  if (mode !== "escape") throw new Error("expected cancellation or fault");
} catch (error) {
  if (
    mode === "abort" && error instanceof InteractionCancelled
  ) {
    /* Expected. */
  } else if (
    mode === "provider" && error instanceof Error &&
    error.message === "sample provider failed"
  ) {
    /* Expected. */
  } else throw error;
}
if (cancellations !== 1) {
  throw new Error(`expected one pending read release; got ${cancellations}`);
}
// A real foreground read must receive its own bytes after the parent releases
// pending input. No Deno.exit(): a lingering native read must fail this fixture.
const child = new Deno.Command(Deno.execPath(), {
  args: [
    "eval",
    'console.log("CHILD_READY"); const buffer = new Uint8Array(32); await Deno.stdin.read(buffer); console.log("CHILD_DONE");',
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).spawn();
if (!(await child.status).success) throw new Error("foreground input failed");
// Re-enter through the same I/O object and broker after cancellation.
await runTerminalApplication(demo, { io });
console.log("OWNERSHIP_RESTORED");
