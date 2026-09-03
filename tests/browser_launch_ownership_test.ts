import { assertEquals } from "@std/assert";
import { browserLaunchAttempts } from "../scripts/browser.ts";
import {
  trackedTypeScriptSources,
  type TypeScriptSource,
} from "./support/tracked-typescript.ts";
const BROWSER_LAUNCH_OWNERS = new Set([
  "scripts/browser.ts",
  "scripts/component-example-images.ts",
]);

function hasRuntimePlaywrightImport(source: string): boolean {
  for (
    const match of source.matchAll(
      /import\s+([^;]+?)\s+from\s+["']playwright-core["']\s*;/gsu,
    )
  ) {
    const clause = match[1]?.trim() ?? "";
    if (clause.startsWith("type ")) continue;
    if (clause.startsWith("{") && clause.endsWith("}")) {
      const specifiers = clause.slice(1, -1).split(",").map((part) =>
        part.trim()
      ).filter(Boolean);
      if (specifiers.every((specifier) => specifier.startsWith("type "))) {
        continue;
      }
    }
    return true;
  }
  return false;
}

function browserLaunchOwnershipViolations(
  sources: readonly TypeScriptSource[],
): readonly string[] {
  return sources.flatMap(({ path, source }) =>
    hasRuntimePlaywrightImport(source) && !BROWSER_LAUNCH_OWNERS.has(path)
      ? [path]
      : []
  );
}

function installedBrowserChannelViolations(
  sources: readonly TypeScriptSource[],
): readonly string[] {
  const installedChannel =
    /channel\s*:\s*["'](?!chromium["']|chrome-for-testing["'])[^"']+["']/gu;
  return sources.flatMap(({ path, source }) => {
    if (!hasRuntimePlaywrightImport(source)) return [];
    return [...source.matchAll(installedChannel)].map((match) => {
      const line = source.slice(0, match.index).split("\n").length;
      return `${path}:${line}`;
    });
  });
}

Deno.test("unattended browser launches cannot select an installed application channel", async () => {
  const sources = await trackedTypeScriptSources();
  assertEquals(
    browserLaunchOwnershipViolations(sources),
    [],
    "Route browser processes through one of the two lifecycle-owning launchers",
  );
  assertEquals(
    installedBrowserChannelViolations(sources),
    [],
    "Use Playwright-managed Chrome for Testing unless DISCERN_CHROME_PATH explicitly overrides it",
  );
});

Deno.test("an unrelated parallel browser launcher auto-enrols in the guard", () => {
  const packageName = "playwright-" + "core";
  const channelProperty = "chan" + "nel";
  const futureSibling = [{
    path: "tests/future-render-engine.ts",
    source: `
      import { chromium as engine } from "${packageName}";
      await engine.launch({ ${channelProperty}: "msedge", headless: true });
    `,
  }];
  assertEquals(browserLaunchOwnershipViolations(futureSibling), [
    "tests/future-render-engine.ts",
  ]);
  assertEquals(installedBrowserChannelViolations(futureSibling), [
    "tests/future-render-engine.ts:3",
  ]);
});

Deno.test("the shared launcher chooses only the managed or explicit executable", () => {
  assertEquals(browserLaunchAttempts(undefined, "/managed/chrome"), [{
    label: "Playwright-managed Chrome for Testing (/managed/chrome)",
    options: { executablePath: "/managed/chrome", headless: true },
  }]);
  assertEquals(
    browserLaunchAttempts("/explicit/automation-browser", "/managed/chrome"),
    [{
      label: "DISCERN_CHROME_PATH (/explicit/automation-browser)",
      options: {
        executablePath: "/explicit/automation-browser",
        headless: true,
      },
    }],
  );
});
