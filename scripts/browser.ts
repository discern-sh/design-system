import { type Browser, chromium } from "playwright-core";

type BrowserLaunchOptions = Parameters<typeof chromium.launch>[0];

/** Resolve the one automation browser a gate is allowed to launch implicitly. */
export function browserLaunchAttempts(
  explicitPath: string | undefined,
  managedPath: string,
): readonly {
  readonly label: string;
  readonly options: BrowserLaunchOptions;
}[] {
  const executablePath = explicitPath ?? managedPath;
  return [{
    label: explicitPath === undefined
      ? `Playwright-managed Chrome for Testing (${managedPath})`
      : `DISCERN_CHROME_PATH (${explicitPath})`,
    options: { executablePath, headless: true },
  }];
}

/** Launch the browser used by conformance and browser-backed tests. */
export async function launchBrowser(): Promise<Browser> {
  const attempts = browserLaunchAttempts(
    Deno.env.get("DISCERN_CHROME_PATH"),
    chromium.executablePath(),
  );
  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      failures.push(
        `${attempt.label}: ${
          error instanceof Error ? error.message.split("\n")[0] : String(error)
        }`,
      );
    }
  }
  throw new Error(
    `No compatible automation browser was available. Install the Playwright-managed Chromium version locked by this project, or explicitly set DISCERN_CHROME_PATH to an isolated automation browser.\n${
      failures.join("\n")
    }`,
  );
}
