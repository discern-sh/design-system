import { Buffer } from "node:buffer";
import server from "../scripts/serve.ts";
import { catalogueComponentPath } from "../catalogue/routes.ts";
import { assert, assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join, toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CatalogueExample } from "../catalogue/conformance.ts";
import { loadComponentSources } from "../scripts/generate.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import { browserBehaviorSources } from "../src/generated/behaviors.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { CopyButton } from "../src/react.ts";
import { exactValues } from "./fixtures/static-copy-consumer.tsx";

const root = fromFileUrl(new URL("../", import.meta.url));

// Stage only publish-allowlisted sources, without repository CSS or assets.
async function stageSources(source: string, target: string): Promise<void> {
  await Deno.mkdir(target, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (entry.name === "fixtures" || entry.name.endsWith(".examples.tsx")) {
      continue;
    }
    const from = join(source, entry.name), to = join(target, entry.name);
    if (entry.isDirectory) await stageSources(from, to);
    else if (/\.(?:ts|tsx|js)$/.test(entry.name)) await Deno.copyFile(from, to);
  }
}

Deno.test("published static copy consumer writes exact authored text without React", async () => {
  const staged = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await stageSources(join(root, "src"), join(staged, "src"));
    await Deno.copyFile(join(root, "deno.json"), join(staged, "deno.json"));
    const fixture = join(staged, "tests/fixtures/static-copy-consumer.tsx");
    await Deno.mkdir(dirname(fixture), { recursive: true });
    await Deno.copyFile(
      join(root, "tests/fixtures/static-copy-consumer.tsx"),
      fixture,
    );
    const output = join(staged, "public");
    const built = await new Deno.Command(Deno.execPath(), {
      cwd: staged,
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env=NODE_ENV",
        fixture,
        toFileUrl(`${output}/`).href,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(built.code, 0, new TextDecoder().decode(built.stderr));
    const page = await browser.newPage();
    // Route a real built document and its emitted files through an HTTP origin.
    const requested: string[] = [];
    await page.route("http://static-copy.test/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      requested.push(path);
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(value: string) {
            document.dispatchEvent(
              new CustomEvent("fixture-write", { detail: value }),
            );
            const mode = document.documentElement.dataset.mode;
            if (mode === "denied") {
              return Promise.reject(new Error("Permission denied"));
            }
            if (mode === "pending") {
              return new Promise<void>((resolve) =>
                document.addEventListener("fixture-resolve", () => resolve(), {
                  once: true,
                })
              );
            }
            return Promise.resolve();
          },
        },
      });
      document.addEventListener("fixture-write", (event) => {
        const values = JSON.parse(
          document.documentElement.dataset.writes ?? "[]",
        ) as string[];
        values.push((event as CustomEvent<string>).detail);
        document.documentElement.dataset.writes = JSON.stringify(values);
      });
    });
    await page.goto("http://static-copy.test/");
    for (const [index, value] of exactValues.entries()) {
      await page.locator(`#exact-${index}`).click();
      await page.waitForFunction(
        () => document.documentElement.dataset.writes !== undefined,
        undefined,
        { timeout: 1000 },
      );
      assertEquals(
        await page.evaluate(() =>
          JSON.parse(document.documentElement.dataset.writes!)
        ),
        exactValues.slice(0, index + 1),
        value,
      );
      assert(
        await page.locator(`#exact-${index}`).getAttribute(
          "data-discern-copied",
        ) !== null,
      );
    }
    assert(
      requested.every((path) => path === "/" || path.startsWith("/runtime/")),
    );
    // The real Clipboard API also round-trips valid authored text on a secure origin.
    const nativeContext = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const nativePage = await nativeContext.newPage();
    await nativePage.route("http://127.0.0.1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        path: join(output, path === "/" ? "index.html" : path),
      });
    });
    await nativePage.goto("http://127.0.0.1/");
    for (const index of [0, 1]) {
      await nativePage.locator(`#exact-${index}`).click();
      await nativePage.waitForFunction(
        (id) =>
          document.getElementById(id)!.hasAttribute("data-discern-copied"),
        `exact-${index}`,
      );
      assertEquals(
        await nativePage.evaluate(() => navigator.clipboard.readText()),
        exactValues[index],
      );
    }
    await nativeContext.close();
    const writes = () =>
      page.evaluate(() =>
        JSON.parse(document.documentElement.dataset.writes ?? "[]") as string[]
      );
    const clear = () =>
      page.evaluate(() => {
        document.documentElement.dataset.writes = "[]";
      });
    const copySource = await Deno.readTextFile(
      join(output, "runtime/discern.js"),
    );
    await clear();
    // Every copy control in the published composed fixtures, without a host handler.
    const composed = page.locator(
      "main > :is(.discern-command, .discern-path-reference, .discern-diagnostic, .discern-result-summary) .discern-copy-button",
    );
    for (const button of await composed.all()) {
      const expected = JSON.parse(
        (await button.getAttribute("data-discern-copy-value"))!,
      );
      await button.click();
      await page.waitForFunction(() =>
        document.querySelector("[data-discern-copied]") !== null
      );
      assertEquals((await writes()).at(-1), expected);
    }
    assertEquals((await writes()).length, await composed.count());
    await clear();
    assertEquals(
      await page.locator("#custom-icon").count(),
      1,
      "default icon markup must not duplicate consumer IDs",
    );
    // Re-evaluation is idempotent, and both roots share one owner.
    await page.addScriptTag({ content: copySource });
    await page.addScriptTag({ content: copySource });
    await page.locator("#second-root").click();
    assertEquals(await writes(), ["second root"]);
    assert(
      await page.locator("#outside-root").evaluate((
        button: HTMLButtonElement,
      ) => button.inert),
    );
    await page.locator("#disabled").evaluate((button: HTMLButtonElement) =>
      button.click()
    );
    await page.locator("#cancelled").evaluate((button) =>
      button.addEventListener("click", (event) => event.preventDefault())
    );
    await page.locator("#cancelled").click();
    assertEquals(await writes(), ["second root"]);
    // A disabled fieldset and aria-disabled also retain their native/declared meaning.
    await page.locator("#second-root").evaluate((button) => {
      button.setAttribute("aria-disabled", "true");
    });
    await page.locator("#second-root").dispatchEvent("click");
    assertEquals(await writes(), ["second root"]);
    await page.locator("#second-root").evaluate((button) => {
      button.removeAttribute("aria-disabled");
    });
    await page.locator("#second-root").evaluate((button) => {
      const fieldset = document.createElement("fieldset");
      button.replaceWith(fieldset);
      fieldset.append(button);
      fieldset.disabled = true;
    });
    await page.locator("#second-root").dispatchEvent("click");
    assertEquals(await writes(), ["second root"]);
    await clear();
    await page.locator("#custom").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      document.querySelector("#custom")!.hasAttribute("data-discern-copied")
    );
    assertEquals(
      await page.locator(
        "#custom [aria-live] [data-discern-copy-feedback=copied]",
      )
        .textContent(),
      "Saved text",
    );
    assertEquals(
      await page.locator("#custom").evaluate((button) =>
        button === document.activeElement
      ),
      true,
    );
    await page.waitForFunction(() =>
      !document.querySelector("#custom")!.hasAttribute("data-discern-copied")
    );
    assert(await page.locator("#custom strong").isVisible());
    await page.keyboard.press("Space");
    assertEquals(await writes(), ["custom", "custom"]);
    await page.evaluate(() => {
      document.documentElement.dataset.mode = "denied";
    });
    await page.locator("#custom").click();
    await page.waitForFunction(() =>
      document.querySelector("#custom")!.hasAttribute(
        "data-discern-copy-failed",
      )
    );
    assertEquals(
      await page.locator("#custom").getAttribute("data-discern-copied"),
      null,
    );
    assert(
      await page.locator(
        "#custom [aria-live] [data-discern-copy-feedback=failed]",
      )
        .isVisible(),
    );
    assertEquals(
      await page.locator("#custom [aria-live]").getAttribute("aria-atomic"),
      "true",
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
    });
    await page.locator("#exact-0").click();
    await page.waitForFunction(() =>
      document.querySelector("#exact-0")!.hasAttribute(
        "data-discern-copy-failed",
      )
    );
    assertEquals(
      await page.locator("#exact-0").getAttribute("data-discern-copied"),
      null,
    );
    // No script: the authored document cannot promise a working action.
    const noScript = await browser.newPage({ javaScriptEnabled: false });
    await noScript.setContent(
      await Deno.readTextFile(join(output, "index.html")),
    );
    for (const button of await noScript.locator(".discern-copy-button").all()) {
      assert(
        await button.evaluate((element: HTMLButtonElement) => element.inert),
      );
    }
    await noScript.close();

    // Pending writes neither claim success nor permit duplicate activation.
    await page.reload();
    await page.evaluate(() => {
      document.documentElement.dataset.mode = "pending";
    });
    await page.locator("#exact-0").click();
    await page.locator("#exact-0").click();
    assertEquals(await writes(), [exactValues[0]]);
    assertEquals(
      await page.locator("#exact-0").getAttribute("data-discern-copied"),
      null,
    );
    assertEquals(
      await page.locator("#exact-0").getAttribute("aria-busy"),
      "true",
    );
    // Removing an opted-in root and reinserting it releases pending work and timers.
    await page.locator("main").evaluate((element) => {
      element.removeAttribute("data-discern-root");
    });
    await page.waitForFunction(() =>
      (document.querySelector("#exact-0") as HTMLButtonElement).inert
    );
    await page.locator("main").evaluate((element) => {
      element.setAttribute("data-discern-root", "");
    });
    await page.evaluate(() =>
      document.dispatchEvent(new Event("fixture-resolve"))
    );
    assertEquals(
      await page.locator("#exact-0").getAttribute("data-discern-copied"),
      null,
    );
    await page.evaluate(() => {
      document.documentElement.dataset.mode = "success";
    });
    await page.locator("#exact-0").click();
    assertEquals(await writes(), [exactValues[0], exactValues[0]]);
    await page.evaluate(() =>
      document.dispatchEvent(new Event("discern:copy-button:teardown"))
    );
    assert(
      await page.locator("#exact-0").evaluate((button: HTMLButtonElement) =>
        button.inert
      ),
    );
    await page.addScriptTag({ content: copySource });
    await page.locator("#exact-0").click();
    assertEquals(await writes(), [
      exactValues[0],
      exactValues[0],
      exactValues[0],
    ]);
    await page.locator("#exact-0").evaluate((button) =>
      button.setAttribute("data-discern-copy-value", JSON.stringify("changed"))
    );
    await page.waitForFunction(() =>
      !document.querySelector("#exact-0")!.hasAttribute("data-discern-copied")
    );
    await page.locator("#exact-0").click();
    assertEquals((await writes()).at(-1), "changed");
    await page.locator("#exact-0").evaluate((button) => button.remove());
    await page.waitForFunction(() => !document.querySelector("#exact-0"));
  } finally {
    await browser.close();
    await Deno.remove(staged, { recursive: true });
  }
});

function ArchiveKey() {
  return (
    <aside>
      <CopyButton value="new sibling\n" />
    </aside>
  );
}

function reachesCopy(slug: string): boolean {
  if (slug === "copy-button") return true;
  return componentRegistry.find((entry) => entry.meta.slug === slug)!
    .dependencies.some(reachesCopy);
}

Deno.test("copy dependencies automatically enroll canonical static examples and future compositions", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    const members = componentRegistry.filter((entry) =>
      reachesCopy(entry.meta.slug)
    );
    const sources = await loadComponentSources();
    const markup: string[] = [];
    for (const member of members) {
      const runtime = await emitDesignSystemRuntime({
        outputRoot: toFileUrl(`${output}/`),
        components: [member.meta.slug],
      });
      assertEquals(
        runtime.manifest.outputs.scripts,
        ["discern.js"],
        member.meta.slug,
      );
      assert(
        (await Deno.readTextFile(join(output, "discern.js"))).includes(
          browserBehaviorSources["copy-button"].trim(),
        ),
      );
      const source = sources.find((source) =>
        source.meta.slug === member.meta.slug
      )!;
      const { catalogueExamples } = await import(source.examplesUrl.href) as {
        catalogueExamples: CatalogueExample[];
      };
      for (const { Example } of catalogueExamples) {
        markup.push(renderToStaticMarkup(createElement(Example)));
      }
    }
    markup.push(renderToStaticMarkup(<ArchiveKey />));
    const page = await browser.newPage();
    await page.setContent(`<main data-discern-root>${markup.join("")}</main>`);
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText(value: string) {
            document.documentElement.dataset.copiedValue = value;
            document.documentElement.dataset.count = String(
              Number(document.documentElement.dataset.count ?? 0) + 1,
            );
            return Promise.resolve();
          },
        },
      })
    );
    // Negative control: without the selected behaviour every generated affordance is inert.
    const controls = page.locator(".discern-copy-button");
    assert(await controls.count() > members.length);
    for (const button of await controls.all()) {
      assert(
        await button.evaluate((element: HTMLButtonElement) => element.inert),
      );
    }
    await page.addScriptTag({ content: browserBehaviorSources["copy-button"] });
    for (const [index, button] of (await controls.all()).entries()) {
      const expected = JSON.parse(
        (await button.getAttribute("data-discern-copy-value"))!,
      );
      await button.click();
      assertEquals(
        await page.evaluate(() => document.documentElement.dataset.copiedValue),
        expected,
      );
      assertEquals(
        await page.evaluate(() =>
          Number(document.documentElement.dataset.count)
        ),
        index + 1,
      );
      assertEquals(await button.getAttribute("data-discern-copied"), "");
    }
    console.info(
      `Static copy population: ${members.length} dependency members, ${await controls
        .count()} controls including ArchiveKey.`,
    );
    const first = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["copy-button"],
    });
    const bytes = await Deno.readTextFile(join(output, "discern.js"));
    const second = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["copy-button"],
    });
    assertEquals(first, second);
    assertEquals(await Deno.readTextFile(join(output, "discern.js")), bytes);
    const unrelated = await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["button"],
    });
    assertEquals(unrelated.manifest.outputs.scripts, []);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("live Catalogue and selected copy runtime share one clipboard owner", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.route("http://catalogue-copy.test/**", async (route) => {
      const response = await server.fetch(new Request(route.request().url()));
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
    });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText(value: string) {
            document.documentElement.dataset.copiedValue = value;
            document.documentElement.dataset.count = String(
              Number(document.documentElement.dataset.count ?? 0) + 1,
            );
            return Promise.resolve();
          },
        },
      })
    );
    await page.goto(
      `http://catalogue-copy.test${catalogueComponentPath("copy-button")}`,
    );
    const button = page.locator("#component-copy-button .discern-copy-button")
      .first();
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "1",
    );
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.copiedValue),
      "lorem ipsum dolor sit amet",
    );
    await page.addScriptTag({ content: browserBehaviorSources["copy-button"] });
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "2",
    );
    await button.evaluate((element) =>
      element.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      })
    );
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "2",
    );
  } finally {
    await browser.close();
  }
});

Deno.test("live React copy props preserve cancellation, disabled updates, and remounts", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    const bundle = join(output, "host.js");
    const built = await new Deno.Command(Deno.execPath(), {
      cwd: root,
      args: [
        "bundle",
        "--config",
        "deno.json",
        "--output",
        bundle,
        "tests/fixtures/live-copy-host.tsx",
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(built.code, 0, new TextDecoder().decode(built.stderr));
    const page = await browser.newPage();
    await page.setContent(
      '<main data-discern-root id="live-copy-root"></main>',
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText(value: string) {
            document.documentElement.dataset.value = value;
            document.documentElement.dataset.count = String(
              Number(document.documentElement.dataset.count ?? 0) + 1,
            );
            return Promise.resolve();
          },
        },
      })
    );
    await page.addScriptTag({ content: browserBehaviorSources["copy-button"] });
    await page.addScriptTag({ path: bundle });
    const button = page.locator("#live-copy");
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      undefined,
    );
    await page.locator("#toggle-cancel").click();
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "1",
    );
    await page.locator("#toggle-icons").click();
    assertEquals(
      await button.locator(".discern-copy-button__icon:not([hidden])")
        .textContent(),
      "✓",
    );
    await page.locator("#change-value").click();
    assertEquals(await button.getAttribute("data-discern-copied"), null);
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.value),
      "second value",
    );
    await page.locator("#toggle-disabled").click();
    await page.waitForFunction(() =>
      (document.querySelector("#live-copy") as HTMLButtonElement).disabled
    );
    await button.evaluate((element: HTMLButtonElement) => element.click());
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "2",
    );
    await page.locator("#toggle-disabled").click();
    await page.locator("#toggle-mount").click();
    await page.locator("#toggle-mount").click();
    await button.click();
    assertEquals(
      await page.evaluate(() => document.documentElement.dataset.count),
      "3",
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
