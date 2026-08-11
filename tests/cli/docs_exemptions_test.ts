import { assertEquals } from "@std/assert";
import { cliComponentRegistry } from "../../src/cli/mod.ts";

Deno.test("browser-only Docs components carry exact CLI exemption reasons", () => {
  assertEquals(cliComponentRegistry["copy-button"], {
    stance: "exempt",
    reason:
      "Clipboard mutation and transient confirmation require an interactive driver, not a pure terminal renderer.",
  });
  assertEquals(cliComponentRegistry["search-palette"], {
    stance: "exempt",
    reason:
      "Modal focus management, query input, and result activation belong to an interactive terminal driver.",
  });
  assertEquals(cliComponentRegistry["skip-link"], {
    stance: "exempt",
    reason:
      "Browser focus-bypass navigation has no terminal document equivalent because terminal output is already linear.",
  });
});
