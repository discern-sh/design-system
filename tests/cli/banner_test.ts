import { renderBannerCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testCapabilities,
} from "./helpers.ts";

const frames = {
  narrow: "┌ Success ───┐\n│ Ready.     │\n└────────────┘",
  standard:
    "┌ Success ─────────────────┐\n│ Ready.                   │\n└──────────────────────────┘",
  wide:
    "┌ Success ─────────────────────────────────────┐\n│ Ready.                                       │\n└──────────────────────────────────────────────┘",
} as const;

Deno.test("Banner renders exact narrow, standard, and wide frames", () => {
  for (
    const [columns, expected] of [[14, frames.narrow], [28, frames.standard], [
      48,
      frames.wide,
    ]] as const
  ) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderBannerCli(
        { message: "Ready.", tone: "success", width: columns },
        capabilities,
      ),
      expected,
      capabilities,
    );
  }
});

Deno.test("Banner preserves its frame through every colour capability", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderBannerCli(
        { message: "Ready.", tone: "success", width: 28 },
        capabilities,
      ),
      frames.standard,
      capabilities,
    );
  }
  const capabilities = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderBannerCli(
      { message: "Build passed.", tone: "success", width: 24 },
      capabilities,
    ),
    "+ Success -------------+\n| Build passed.        |\n+----------------------+",
    capabilities,
  );
});
