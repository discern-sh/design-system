import { assert, assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { Callout } from "../src/components/editorial/callout/callout.tsx";
import type { CalloutTone } from "../src/components/editorial/callout/callout.types.ts";

Deno.test("Callout tone remains named when consumers omit or replace artwork", () => {
  const tones = {
    note: "Information",
    insight: "Insight",
    warning: "Warning",
    success: "Success",
  } satisfies Record<CalloutTone, string>;
  for (const [tone, label] of Object.entries(tones)) {
    for (const icon of [undefined, "◇"]) {
      const html = renderToStaticMarkup(
        <Callout
          tone={tone as CalloutTone}
          icon={icon}
          title="An independently worded heading"
        >
          Supporting context.
        </Callout>,
      );
      assert(
        html.includes(`role="img" aria-label="${label}"`),
        `${tone} keeps its named visible witness with icon ${icon}`,
      );
      assertEquals((html.match(/<h3/g) ?? []).length, 1);
    }
  }
});

import { toFileUrl } from "@std/path";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { Banner } from "../src/components/feedback/banner/banner.tsx";
import { Button } from "../src/components/core/button/button.tsx";
import { catalogueExamples as emptyExamples } from "../src/components/feedback/empty-state/empty-state.examples.tsx";
import { cliExamples as emptyCliExamples } from "../src/components/feedback/empty-state/empty-state.cli.ts";

Deno.test("Empty states distinguish first use, search, availability, and recovery without alerts", () => {
  for (
    const id of ["default", "no-results", "unavailable", "recoverable-failure"]
  ) {
    const example = emptyExamples.find((entry) => entry.id === id)!;
    const html = renderToStaticMarkup(<example.Example />);
    assert(html.includes("discern-empty-state__description"));
    assert(html.includes("<button"));
    assert(!html.includes('role="alert"') && !html.includes('role="status"'));
    const terminal = emptyCliExamples.find((entry) => entry.name === id)!;
    assert(terminal.props.description && terminal.props.action);
  }
  assertEquals(
    new Set(emptyCliExamples.map(({ props }) => props.title)).size,
    emptyCliExamples.length,
  );
});

Deno.test("Feedback hierarchy and actions stay contained in both themes and forced colours", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["banner", "callout", "empty-state", "button"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const explanation =
      "Keep the original content available while reviewing the updated information. This deliberately long explanation includes an unbroken reference abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz.";
    const html = [
      ...(["neutral", "accent", "success", "warning", "danger"] as const).map((
        tone,
      ) =>
        renderToStaticMarkup(
          <Banner
            tone={tone}
            heading="A long heading that describes the current state"
            actions={
              <Button variant="secondary">
                Review the available next step
              </Button>
            }
          >
            {explanation}
          </Banner>,
        )
      ),
      ...(["note", "insight", "warning", "success"] as const).map((tone) =>
        renderToStaticMarkup(
          <Callout
            tone={tone}
            title="A long heading that describes the current state"
            actions={
              <Button variant="secondary">
                Review the available next step
              </Button>
            }
          >
            {explanation}
          </Callout>,
        )
      ),
      ...emptyExamples.map(({ Example }) => renderToStaticMarkup(<Example />)),
    ].join("");
    for (const theme of ["light", "dark"]) {
      for (const width of [260, 390, 720]) {
        await page.setContent(
          `<html data-discern-root data-discern-theme="${theme}"><head><style>${css}</style></head><body><main style="width:${width}px">${html}</main></body></html>`,
        );
        for (const forcedColors of ["none", "active"] as const) {
          await page.emulateMedia({ forcedColors });
          assertEquals(await page.getByRole("img").count(), 9);
          const violations = await page.locator("main > *").evaluateAll((
            nodes,
          ) =>
            nodes.flatMap((node) => {
              const box = node.getBoundingClientRect();
              return [...node.querySelectorAll("*")].filter((child) => {
                const rect = child.getBoundingClientRect();
                return rect.width > 0 &&
                  (rect.left < box.left - 1 || rect.right > box.right + 1);
              }).map((child) => child.className);
            })
          );
          assertEquals(violations, [], `${theme}/${width}/${forcedColors}`);
          const action = page.getByRole("button").first();
          await action.focus();
          assert(
            await action.evaluate((node) =>
              parseFloat(getComputedStyle(node).outlineWidth) > 0
            ),
          );
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Consumer feedback transitions keep region, context, focus and one outcome update", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    const fixture = new URL(
      "../src/components/feedback/banner/banner.examples.tsx",
      import.meta.url,
    ).href;
    await Deno.writeTextFile(
      `${output}/host.tsx`,
      `import {createRoot} from "react-dom/client"; import {FeedbackTransitionExample} from ${
        JSON.stringify(fixture)
      }; createRoot(document.getElementById("host")!).render(<FeedbackTransitionExample outcome={document.documentElement.dataset.outcome as "success" | "failure"}/>);`,
    );
    const built = await new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--config",
        new URL("../deno.json", import.meta.url).pathname,
        "--output",
        `${output}/host.js`,
        `${output}/host.tsx`,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(built.code, 0, new TextDecoder().decode(built.stderr));
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/runtime/`),
      components: ["banner", "progress", "button"],
    });
    const css = await Deno.readTextFile(`${output}/runtime/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      for (const width of [260, 390, 720]) {
        for (const outcome of ["success", "failure"]) {
          await page.emulateMedia({ reducedMotion });
          await page.setContent(
            `<html data-discern-root data-outcome="${outcome}"><head><style>${css}</style></head><body><main id="host" style="width:${width}px"></main><button id="elsewhere">Another task</button></body></html>`,
          );
          await page.addScriptTag({ path: `${output}/host.js` });
          const region = page.getByRole("region", { name: "File review" });
          await region.waitFor();
          const originalRegion = await region.elementHandle();
          const status = region.getByRole("status");
          const originalStatus = await status.elementHandle();
          assertEquals(
            await region.locator('[aria-live], [role="status"], [role="alert"]')
              .count(),
            1,
          );
          const heights = [(await region.boundingBox())!.height];
          await status.evaluate((node) => {
            const seen: string[] = [];
            Object.assign(node, { outcomeUpdates: seen });
            new MutationObserver(() => {
              const heading = node.querySelector("h3")!.textContent!;
              if (
                heading === "Files checked successfully" ||
                heading === "File check interrupted"
              ) seen.push(heading);
            }).observe(node, {
              subtree: true,
              childList: true,
              characterData: true,
            });
          });
          const trigger = region.getByRole("button", { name: "Check files" });
          await trigger.focus();
          await trigger.press("Enter");
          await region.getByRole("progressbar").waitFor();
          heights.push((await region.boundingBox())!.height);
          assert(
            await trigger.evaluate((node) => node === document.activeElement),
          );
          await trigger.press("Enter");
          await region.getByRole("heading", {
            name: outcome === "success"
              ? "Files checked successfully"
              : "File check interrupted",
          }).waitFor();
          heights.push((await region.boundingBox())!.height);
          assert(
            await trigger.evaluate((node) => node === document.activeElement),
          );
          assert(
            await region.evaluate(
              (node, original) => node === original,
              originalRegion,
            ),
          );
          assert(
            await status.evaluate(
              (node, original) => node === original,
              originalStatus,
            ),
          );
          assertEquals(
            await status.evaluate((node) =>
              (node as HTMLElement & { outcomeUpdates: string[] })
                .outcomeUpdates.length
            ),
            1,
          );
          assertEquals(await region.getByRole("progressbar").count(), 0);
          assert(
            Math.max(...heights) - Math.min(...heights) <= 1,
            `stable height ${outcome}/${width}: ${heights}`,
          );
          assert(
            await region.getByText(
              "Review 8 selected files. Originals stay unchanged.",
            ).isVisible(),
          );
          // A retry must not retrieve focus after the reader moves to another task.
          await trigger.press("Enter");
          await region.getByRole("progressbar").waitFor();
          await page.getByRole("button", { name: "Another task" }).focus();
          await region.getByRole("heading", {
            name: outcome === "success"
              ? "Files checked successfully"
              : "File check interrupted",
          }).waitFor();
          assert(
            await page.getByRole("button", { name: "Another task" }).evaluate((
              node,
            ) => node === document.activeElement),
          );
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
