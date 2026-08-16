import { renderBreadcrumbsCli, renderTabsCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const breadcrumbs = {
  items: [{ label: "Home" }, { label: "Library" }],
  current: "Components",
} as const;
const breadcrumbFrames = [
  "Home ›\nLibrary ›\n[Components]",
  "Home › Library ›\n[Components]",
  "Home › Library › [Components]",
] as const;

Deno.test("Breadcrumbs renders exact narrow, standard, and wide paths", () => {
  for (const [index, columns] of [12, 28, 48].entries()) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderBreadcrumbsCli({ ...breadcrumbs, width: columns }, capabilities),
      breadcrumbFrames[index] ?? "",
      capabilities,
    );
  }
});

Deno.test("Breadcrumbs preserves its path across every capability level", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderBreadcrumbsCli({ ...breadcrumbs, width: 28 }, capabilities),
      breadcrumbFrames[1],
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 28,
    unicode: false,
  });
  assertExactFrame(
    renderBreadcrumbsCli({ ...breadcrumbs, width: 28 }, capabilities),
    "Home > Library >\n[Components]",
    capabilities,
  );
});

const tabs = {
  items: [
    { value: "overview", label: "Overview", content: "Summary content." },
    { value: "details", label: "Details", content: "Detailed content." },
    { value: "history", label: "History", disabled: true },
  ],
  activeValue: "overview",
} as const;
const tabFrames = [
  "[Overview]\nDetails\n(History)\n┌ Overv… ──┐\n│ Summary  │\n│ content. │\n└──────────┘",
  "[Overview] Details (History)\n┌ Overview ────────────────┐\n│ Summary content.         │\n└──────────────────────────┘",
  "[Overview] Details (History)\n┌ Overview ────────────────────────────────────┐\n│ Summary content.                             │\n└──────────────────────────────────────────────┘",
] as const;

Deno.test("Tabs renders exact narrow, standard, and wide strips", () => {
  for (const [index, columns] of [12, 28, 48].entries()) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderTabsCli({ ...tabs, width: columns }, capabilities),
      tabFrames[index] ?? "",
      capabilities,
    );
  }
});

Deno.test("Tabs preserves selection across every capability level", () => {
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testTerminalCapabilities({ colorDepth, columns: 28 });
    assertStyledFrame(
      renderTabsCli({ ...tabs, width: 28 }, capabilities),
      tabFrames[1],
      capabilities,
    );
  }
  const capabilities = testTerminalCapabilities({
    columns: 28,
    unicode: false,
  });
  assertExactFrame(
    renderTabsCli({
      ...tabs,
      focusedValue: "details",
      activationMode: "manual",
      width: 28,
    }, capabilities),
    "[Overview] >Details\n(History)\n+ Overview ----------------+\n| Summary content.         |\n+--------------------------+",
    capabilities,
  );
});
