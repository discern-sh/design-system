import { Buffer } from "node:buffer";
import type { Browser, Dialog, Page } from "playwright-core";
import { BUILDER_STORAGE_KEYS } from "../../../catalogue/builder/persistence.ts";
import { placeNamedComponent } from "./discovery.ts";
import { documentWitness, findOutlineRow, selectComposition } from "./tree.ts";
import {
  ACTION_TIMEOUT,
  attempt,
  BUILDER_SHELL,
  invariant,
  loadBuilderPage,
  OUTLINE_ROW,
  STORAGE_KEYS,
  useTheme,
  WIDE_VIEWPORT,
  withAuxiliaryPage,
} from "./support.ts";

export async function verifyMalformedRetry(page: Page): Promise<number> {
  await selectComposition(page);
  const input = page.locator(
    '#discern-builder-pane-inspector input[type="file"]',
  );
  const before = await documentWitness(page);
  const dialogs: string[] = [];
  const onDialog = async (dialog: Dialog): Promise<void> => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  };
  page.on("dialog", onDialog);
  try {
    const payload = {
      name: "malformed-composition.json",
      mimeType: "application/json",
      buffer: Buffer.from("{not valid json"),
    };
    await input.setInputFiles(payload);
    const firstAlert = page.getByRole("alert").last();
    await firstAlert.waitFor({ timeout: ACTION_TIMEOUT });
    const firstHandle = await firstAlert.elementHandle();
    invariant(firstHandle !== null, "malformed load alert has no DOM handle");
    invariant(
      await documentWitness(page) === before,
      "malformed load changed the document",
    );
    await input.setInputFiles(payload);
    await page.waitForFunction(
      (element) => element === null || !element.isConnected,
      firstHandle,
      { timeout: ACTION_TIMEOUT },
    );
    invariant(
      await documentWitness(page) === before,
      "same-file malformed retry changed the document",
    );
    invariant(dialogs.length === 0, "malformed load used a blocking dialog");
    return 2;
  } finally {
    page.off("dialog", onDialog);
  }
}

export async function verifySaveFile(page: Page): Promise<number> {
  await selectComposition(page);
  await page.evaluate(() => {
    const evidence = {
      created: [] as string[],
      revoked: [] as string[],
      downloads: [] as { readonly href: string; readonly name: string }[],
    };
    Object.defineProperty(globalThis, "__discernBuilderDownloadEvidence", {
      configurable: true,
      value: evidence,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => {
        const url = `blob:builder-conformance-${
          String(evidence.created.length)
        }`;
        evidence.created.push(url);
        return url;
      },
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: (url: string) => evidence.revoked.push(url),
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value(this: HTMLAnchorElement) {
        evidence.downloads.push({ href: this.href, name: this.download });
      },
    });
  });
  await page.getByRole("button", { name: "Save file", exact: true }).click();
  await page.waitForFunction(() => {
    const scope = globalThis as typeof globalThis & {
      __discernBuilderDownloadEvidence?: {
        readonly revoked: readonly string[];
      };
    };
    return scope.__discernBuilderDownloadEvidence?.revoked.length === 1;
  });
  const evidence = await page.evaluate(() => {
    const scope = globalThis as typeof globalThis & {
      __discernBuilderDownloadEvidence?: {
        readonly created: readonly string[];
        readonly revoked: readonly string[];
        readonly downloads: readonly {
          readonly href: string;
          readonly name: string;
        }[];
      };
    };
    return scope.__discernBuilderDownloadEvidence;
  });
  invariant(evidence !== undefined, "save-file evidence was not recorded");
  invariant(
    evidence.created.length === 1 &&
      evidence.revoked.length === 1 &&
      evidence.created[0] === evidence.revoked[0],
    `save-file object URL lifecycle was ${JSON.stringify(evidence)}`,
  );
  invariant(
    evidence.downloads.length === 1 &&
      evidence.downloads[0]?.name === "untitled-page.json",
    `save-file name was ${JSON.stringify(evidence.downloads)}`,
  );
  invariant(
    await page.getByRole("status").filter({
      hasText: "Saved the composition file",
    }).count() === 1,
    "save-file completion was not announced",
  );
  return 3;
}

export async function verifySuccessfulLoad(page: Page): Promise<number> {
  await selectComposition(page);
  const input = page.locator(
    '#discern-builder-pane-inspector input[type="file"]',
  );
  await input.setInputFiles({
    name: "browser-loaded.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      version: 1,
      name: "Loaded by browser proof",
      children: [],
    })),
  });
  await page.getByRole("status").filter({
    hasText: "Loaded browser-loaded.json",
  }).waitFor({ timeout: ACTION_TIMEOUT });
  invariant(
    await page.getByRole("textbox", { name: "Composition name" })
      .inputValue() ===
      "Loaded by browser proof",
    "successful file load did not replace the document",
  );
  invariant(
    await page.locator(OUTLINE_ROW).count() === 0,
    "successful empty file load retained previous children",
  );
  return 3;
}

export async function verifyCorruptStorage(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  const source = "{corrupt saved composition";
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript(
        ({ key, source }) => {
          if (!location.pathname.endsWith("/catalogue/builder/")) return;
          localStorage.setItem(key, source);
        },
        { key: BUILDER_STORAGE_KEYS.document, source },
      );
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      const alert = page.getByRole("alert").filter({
        hasText: "could not be restored",
      });
      await alert.waitFor({ timeout: ACTION_TIMEOUT });
      await page.getByText("Rejected composition recovery source", {
        exact: true,
      }).first().click({ timeout: ACTION_TIMEOUT });
      invariant(
        await page.getByRole("textbox", {
          name: "Rejected composition recovery source",
        }).inputValue() === source,
        "corrupt source was not exposed for recovery",
      );
      invariant(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          BUILDER_STORAGE_KEYS.recovery,
        ) === source,
        "corrupt source was not preserved in recovery storage",
      );
      const name = page.getByRole("textbox", { name: "Composition name" });
      await name.fill("Recovered editing session");
      await name.press("Enter");
      invariant(
        await name.inputValue() === "Recovered editing session",
        "recovery fallback is not editable",
      );
    },
  );
}

export async function verifyStorageReadDenial(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript((keys) => {
        if (!location.pathname.endsWith("/catalogue/builder/")) return;
        const original = Storage.prototype.getItem;
        Object.defineProperty(Storage.prototype, "getItem", {
          configurable: true,
          value(this: Storage, key: string): string | null {
            if ((keys as readonly string[]).includes(key)) {
              throw new DOMException("Storage denied", "SecurityError");
            }
            return original.call(this, key);
          },
        });
      }, STORAGE_KEYS);
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      await page.getByRole("alert").filter({
        hasText: "storage is unavailable",
      })
        .waitFor({ timeout: ACTION_TIMEOUT });
      const name = page.getByRole("textbox", { name: "Composition name" });
      await name.fill("Still editable");
      await name.press("Enter");
      invariant(
        await name.inputValue() === "Still editable",
        "read denial disabled editing",
      );
      await useTheme(page, "dark");
      invariant(
        await page.locator(BUILDER_SHELL).getAttribute("data-discern-theme") ===
          "dark",
        "read denial prevented an in-memory theme change",
      );
    },
  );
}

export async function verifyQuotaFailure(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    undefined,
    async (page) => {
      await loadBuilderPage(page, origin);
      await page.evaluate((keys) => {
        const original = Storage.prototype.setItem;
        let writes = 0;
        Object.defineProperty(globalThis, "__discernBuilderQuotaWrites", {
          configurable: true,
          get: () => writes,
        });
        Object.defineProperty(Storage.prototype, "setItem", {
          configurable: true,
          value(this: Storage, key: string, value: string): void {
            if ((keys as readonly string[]).includes(key)) {
              writes += 1;
              throw new DOMException("Quota exceeded", "QuotaExceededError");
            }
            original.call(this, key, value);
          },
        });
      }, STORAGE_KEYS);
      await placeNamedComponent(page, "Heading");
      await page.getByRole("alert").filter({ hasText: "could not save" })
        .waitFor({
          timeout: ACTION_TIMEOUT,
        });
      invariant(
        await (await findOutlineRow(page, "Heading")).isVisible(),
        "quota failure lost the edit",
      );
      const writes = await page.evaluate(() =>
        (globalThis as typeof globalThis & {
          __discernBuilderQuotaWrites?: number;
        }).__discernBuilderQuotaWrites ?? 0
      );
      await page.waitForTimeout(150);
      const laterWrites = await page.evaluate(() =>
        (globalThis as typeof globalThis & {
          __discernBuilderQuotaWrites?: number;
        }).__discernBuilderQuotaWrites ?? 0
      );
      invariant(
        writes === 1 && laterWrites === writes,
        `quota circuit attempted ${writes} then ${laterWrites} writes`,
      );
    },
  );
}

export async function verifyFileReadFailure(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<void> {
  await withAuxiliaryPage(
    browser,
    failures,
    { viewport: WIDE_VIEWPORT, reducedMotion: "reduce" },
    async (context) => {
      await context.addInitScript(() => {
        if (!location.pathname.endsWith("/catalogue/builder/")) return;
        Object.defineProperty(File.prototype, "text", {
          configurable: true,
          value: () =>
            Promise.reject(new DOMException("Read failed", "NotReadableError")),
        });
      });
    },
    async (page) => {
      await loadBuilderPage(page, origin);
      await placeNamedComponent(page, "Heading");
      await selectComposition(page);
      const before = await documentWitness(page);
      const input = page.locator(
        '#discern-builder-pane-inspector input[type="file"]',
      );
      const payload = {
        name: "unreadable.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":1,"name":"Unreadable","children":[]}'),
      };
      await input.setInputFiles(payload);
      const first = page.getByRole("alert").filter({
        hasText: "could not be read",
      });
      await first.waitFor({ timeout: ACTION_TIMEOUT });
      const firstHandle = await first.elementHandle();
      invariant(firstHandle !== null, "file-read alert has no DOM handle");
      invariant(
        await documentWitness(page) === before,
        "file read rejection changed the document",
      );
      await input.setInputFiles(payload);
      await page.waitForFunction(
        (element) => element === null || !element.isConnected,
        firstHandle,
        { timeout: ACTION_TIMEOUT },
      );
      invariant(
        await documentWitness(page) === before,
        "file read retry changed the document",
      );
    },
  );
}

export async function verifyContainedFailures(
  browser: Browser,
  origin: string,
  failures: string[],
): Promise<number> {
  const scenarios = [
    ["corrupt storage", verifyCorruptStorage],
    ["storage read denial", verifyStorageReadDenial],
    ["storage quota", verifyQuotaFailure],
    ["file read rejection", verifyFileReadFailure],
  ] as const;
  let passed = 0;
  for (const [label, scenario] of scenarios) {
    passed += Number(
      await attempt(failures, label, false, async () => {
        await scenario(browser, origin, failures);
        return true;
      }),
    );
  }
  return passed;
}
