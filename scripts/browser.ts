import { type Browser, chromium } from "playwright-core";

/** Launch the browser used by conformance and browser-backed tests. */
export async function launchBrowser(): Promise<Browser> {
  const explicitPath = Deno.env.get("DISCERN_CHROME_PATH");
  const attempts: Array<{
    readonly label: string;
    readonly options: Parameters<typeof chromium.launch>[0];
  }> = explicitPath
    ? [{
      label: `DISCERN_CHROME_PATH (${explicitPath})`,
      options: { executablePath: explicitPath, headless: true },
    }]
    : [
      {
        label: "installed Google Chrome",
        options: { channel: "chrome", headless: true },
      },
      {
        label: "Playwright-managed Chromium",
        options: { headless: true },
      },
    ];
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
    `No compatible Chromium browser was available. Install Google Chrome, run the Playwright Chromium installer, or set DISCERN_CHROME_PATH.\n${
      failures.join("\n")
    }`,
  );
}
