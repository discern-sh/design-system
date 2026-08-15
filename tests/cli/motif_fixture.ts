import { defineTerminalMotif } from "../../src/cli/motif.ts";

/** A deliberately non-discern motif shared by override-path tests. */
export const TEST_TERMINAL_MOTIF = defineTerminalMotif({
  unicode: {
    spinner: ["◴", "◷", "◶", "◵"],
    pattern: ["▵", "▹", "▿", "◃"],
    marker: "◉",
    status: { complete: "▵", incomplete: "▿" },
  },
  ascii: {
    spinner: ["1", "2", "3", "4"],
    pattern: ["a", "b"],
    marker: "?",
    status: { complete: "Y", incomplete: "N" },
  },
});
