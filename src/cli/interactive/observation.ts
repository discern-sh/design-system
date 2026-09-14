/** Content-free observation of the runtime terminal boundary. @module */
import type { TerminalIO, TerminalSize } from "./io.ts";

/** Observable terminal geometry, read/write volume, and mode transitions. No content is retained. */
export type TerminalIOObservation =
  | { readonly kind: "size" | "resize"; readonly size: TerminalSize }
  | { readonly kind: "read"; readonly bytes: number | null }
  | { readonly kind: "write"; readonly bytes: number; readonly lines: number }
  | { readonly kind: "raw"; readonly enabled: boolean };

/**
 * Observe a terminal boundary. The caller chooses storage, timestamps, and diagnostic policy.
 * Write and mode events describe attempted effects and run before mutation. Observers should
 * not throw, particularly when called by the terminal host's resize event dispatcher.
 */
export function observeTerminalIO(
  io: TerminalIO,
  observe: (event: TerminalIOObservation) => void,
): TerminalIO {
  return {
    isInteractive: () => io.isInteractive(),
    capabilities: () => io.capabilities(),
    size: () => {
      const size = io.size();
      observe({ kind: "size", size });
      return size;
    },
    read: async () => {
      const value = await io.read();
      observe({ kind: "read", bytes: value?.length ?? null });
      return value;
    },
    ...(io.cancelRead === undefined ? {} : {
      cancelRead: () => io.cancelRead!(),
    }),
    write: (value) => {
      observe({
        kind: "write",
        bytes: new TextEncoder().encode(value).length,
        lines: value.split("\n").length,
      });
      io.write(value);
    },
    setRawMode: (enabled) => {
      observe({ kind: "raw", enabled });
      io.setRawMode(enabled);
    },
    ...(io.listenResize === undefined ? {} : {
      listenResize: (handler: () => void) =>
        io.listenResize!(() => {
          observe({ kind: "resize", size: io.size() });
          handler();
        }),
    }),
  };
}
