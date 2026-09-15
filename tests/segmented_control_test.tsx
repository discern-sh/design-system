import { withViewport } from "../scripts/viewport.ts";
import { catalogueExamples } from "../src/components/forms/segmented-control/segmented-control.examples.tsx";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { SegmentedControl } from "../src/components/forms/segmented-control/segmented-control.tsx";
import renderSegmentedControlCli, {
  cliExamples,
} from "../src/components/forms/segmented-control/segmented-control.cli.ts";
import { resolveSegmentedControlValue } from "../src/components/forms/segmented-control/segmented-control.types.ts";
import { testTerminalCapabilities } from "../src/cli/interactive/testing.ts";
import { stripAnsi } from "../src/cli/ansi.ts";
import { measureText } from "../src/cli/text.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const items = [{ value: "daily", label: "Every day" }, {
  value: "hourly",
  label: "Every hour",
  disabled: true,
}, { value: "weekly", label: "Every week" }] as const;
Deno.test("SegmentedControl keeps identity independent of label, order, and disabled state", () => {
  assertEquals(resolveSegmentedControlValue(items, undefined), "daily");
  assertEquals(
    resolveSegmentedControlValue(items.toReversed(), "daily"),
    "daily",
  );
  assertEquals(resolveSegmentedControlValue(items, "hourly"), "hourly");
  assertEquals(
    resolveSegmentedControlValue(
      items.map((item) => ({ ...item, disabled: true })),
      undefined,
    ),
    undefined,
  );
  for (
    const invalid of [
      [],
      [items[0], items[0]],
      [{ value: "", label: "Empty" }],
      [{ value: "x", label: " " }],
    ]
  ) {
    assertThrows(
      () => resolveSegmentedControlValue(invalid, undefined),
      TypeError,
    );
  }
  assertThrows(() => resolveSegmentedControlValue(items, "missing"), TypeError);
  assertThrows(
    () =>
      renderToStaticMarkup(
        <SegmentedControl label="" name="schedule" items={items} />,
      ),
    TypeError,
  );
  for (const props of [{ defaultValue: "weekly" }, { value: "weekly" }]) {
    const html = renderToStaticMarkup(
      <SegmentedControl
        label="Schedule"
        name="schedule"
        items={items}
        {...props}
      />,
    );
    assertEquals((html.match(/checked=""/g) ?? []).length, 1);
    assert(html.includes('checked="" value="weekly"'));
  }
});

Deno.test("SegmentedControl native static HTML selects, resets, and submits without hydration", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["segmented-control"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const html = renderToStaticMarkup(
      <>
        <form id="task" action="https://example.test/submit" method="get">
          <SegmentedControl
            label="Schedule"
            name="schedule"
            items={items}
            defaultValue="weekly"
          />
          <SegmentedControl
            label="Locked"
            name="locked"
            items={items}
            disabled
          />
          <button type="reset">Reset</button>
          <button type="submit">Save</button>
        </form>
        <SegmentedControl
          label="External"
          name="external"
          form="task"
          items={items}
          value="weekly"
        />
      </>,
    );
    await page.setContent(
      `<html data-discern-root><head><style>${css}</style></head><body>${html}</body></html>`,
    );
    assertEquals(await page.locator("script").count(), 0);
    const schedule = page.getByRole("group", { name: "Schedule", exact: true });
    const weekly = schedule.getByRole("radio", { name: "Every week" });
    const daily = schedule.getByRole("radio", { name: "Every day" });
    assert(await weekly.isChecked());
    await page.keyboard.press("Tab");
    assert(await weekly.evaluate((node) => node === document.activeElement));
    await page.keyboard.press("ArrowLeft");
    assert(await daily.isChecked());
    await schedule.locator("label").last().click();
    assert(await weekly.isChecked());
    await daily.check();
    await page.getByRole("button", { name: "Reset" }).click();
    assert(await weekly.isChecked());
    assert(
      await schedule.getByRole("radio", { name: "Every hour" }).isDisabled(),
    );
    assert(
      await page.getByRole("group", { name: "Locked", exact: true }).getByRole(
        "radio",
      ).first().isDisabled(),
    );
    await daily.check();
    await page.route(
      "https://example.test/submit**",
      (route) => route.fulfill({ body: "Saved" }),
    );
    await Promise.all([
      page.waitForURL("https://example.test/submit**"),
      page.getByRole("button", { name: "Save" }).click(),
    ]);
    const submitted = new URL(page.url()).searchParams;
    assertEquals([...submitted], [["schedule", "daily"], [
      "external",
      "weekly",
    ]]);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("SegmentedControl preserves local containment, target floors, and forced-colour focus", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["segmented-control"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const html = renderToStaticMarkup(
      <SegmentedControl
        label="Processing policy"
        name="policy"
        items={[
          { value: "all", label: "Process every available item" },
          {
            value: "changed",
            label: "ProcessOnlyItemsWithChangesInThisAllocation",
          },
        ]}
      />,
    );
    for (const viewport of [1280, 360]) {
      await withViewport(page, { width: viewport, height: 800 }, async () => {
        for (
          const width of [260, 520, 900].filter((width) => width < viewport)
        ) {
          await page.setContent(
            `<html data-discern-root style="--discern-density:0.8;--discern-structure:0.35"><head><style>${css}</style></head><body><main style="width:${width}px">${html}</main></body></html>`,
          );
          const facts = await page.locator("fieldset").evaluate((root) => ({
            width: root.getBoundingClientRect().width,
            scroll: root.scrollWidth,
            controls: [...root.querySelectorAll("input")].map((input) => ({
              width: input.getBoundingClientRect().width,
              height: input.getBoundingClientRect().height,
            })),
            direction: getComputedStyle(
              root.querySelector(".discern-segmented-control__items")!,
            ).flexDirection,
          }));
          assert(
            facts.scroll <= width + 1 && facts.width <= width + 1,
            JSON.stringify(facts),
          );
          assertEquals(facts.direction, width <= 320 ? "column" : "row");
          for (const control of facts.controls) {
            assert(control.width >= 24 && control.height >= 24);
          }
          await page.emulateMedia({ forcedColors: "active" });
          await page.keyboard.press("Tab");
          const ring = await page.locator("input:focus-visible + span")
            .evaluate((
              node,
            ) => ({
              width: getComputedStyle(node).outlineWidth,
              style: getComputedStyle(node).outlineStyle,
            }));
          assertEquals(ring, { width: "2px", style: "solid" });
          await page.emulateMedia({ forcedColors: "none" });
        }
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("SegmentedControl CLI retains supplied selection and disabled meaning across capabilities", () => {
  for (const columns of [12, 28, 72]) {
    for (const unicode of [false, true]) {
      for (
        const colorDepth of ["none", "ansi16", "ansi256", "truecolor"] as const
      ) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth,
        });
        for (const example of cliExamples) {
          const frame = renderSegmentedControlCli(example.props, capabilities);
          assertEquals(
            frame,
            renderSegmentedControlCli(example.props, capabilities),
          );
          assert(
            frame.split("\n").every((line) => measureText(line) <= columns),
          );
          if (example.name === "disabled") {
            assert(stripAnsi(frame).includes("Disabled"));
          }
        }
      }
    }
  }
  const frame = stripAnsi(
    renderSegmentedControlCli(
      { label: "Schedule", items, value: "weekly" },
      testTerminalCapabilities({ columns: 28, unicode: false }),
    ),
  );
  assert(frame.includes("(*) Every week"));
  assert(!frame.includes("(*) Every day"));
});

Deno.test("content-sized segments share the widest label's width and fit narrow enlarged allocations", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["segmented-control"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage();
    const observed = new Map<string, number>();
    for (const rootSize of [16, 24]) {
      for (const width of [180, 300, 600, 900]) {
        for (
          const label of [
            "Details",
            "Supporting details",
            "AContinuousLabelThatMustWrapWithoutClipping",
          ]
        ) {
          const html = renderToStaticMarkup(
            <SegmentedControl
              sizing="content"
              label="Project view"
              name="view"
              items={[
                { value: "plan", label: "Plan" },
                { value: "details", label },
              ]}
            />,
          );
          await page.setContent(
            `<html data-discern-root><style>${css}html{font-size:${rootSize}px}</style><body><main style="width:${width}px">${html}</main></body></html>`,
          );
          const facts = await page.locator("fieldset").evaluate((root) => {
            const group = root.querySelector(
              ".discern-segmented-control__items",
            )!;
            const box = group.getBoundingClientRect();
            return {
              group: box.width,
              start: box.left - root.getBoundingClientRect().left,
              scroll: root.scrollWidth,
              controls: [...root.querySelectorAll("input")].map((node) => ({
                width: node.getBoundingClientRect().width,
                height: node.getBoundingClientRect().height,
              })),
              labels: [
                ...root.querySelectorAll(".discern-segmented-control__surface"),
              ].map((node) => ({
                content: node.scrollWidth,
                width: node.clientWidth,
              })),
            };
          });
          assert(
            facts.scroll <= width + 1 && facts.group <= width + 1,
            JSON.stringify(facts),
          );
          assert(
            Math.abs(facts.start) < 1,
            "the compact group stays at the start of its allocation",
          );
          assert(
            Math.abs(facts.controls[0]!.width - facts.controls[1]!.width) < 1,
            "segments must have equal widths",
          );
          assert(
            facts.controls.every(({ width, height }) =>
              width >= 24 && height >= 24
            ),
          );
          assert(
            facts.labels.every(({ content, width }) => content <= width + 1),
            "long labels wrap without clipping",
          );
          observed.set(`${rootSize}/${width}/${label}`, facts.group);
          await page.keyboard.press("Tab");
          await page.keyboard.press("ArrowRight");
          assert(
            await page.getByRole("radio", { name: label, exact: true })
              .isChecked(),
          );
        }
      }
      assertEquals(
        observed.get(`${rootSize}/600/Details`),
        observed.get(`${rootSize}/900/Details`),
        "extra parent space must not stretch a compact group",
      );
      assert(
        observed.get(`${rootSize}/900/Supporting details`)! >
          observed.get(`${rootSize}/900/Details`)!,
        "the longest label determines intrinsic group width",
      );
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("repeated SegmentedControl canonical examples retain independent native groups", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const html = renderToStaticMarkup(
      <>
        {catalogueExamples.flatMap((
          { Example, id },
        ) => [<Example key={`${id}-one`} />, <Example key={`${id}-two`} />])}
      </>,
    );
    await page.setContent(html);
    const groups = page.locator("fieldset");
    const names = await groups.evaluateAll((nodes) =>
      nodes.map((node) => node.querySelector("input")!.name)
    );
    assertEquals(
      new Set(names).size,
      names.length,
      "each rendered example must own a distinct native group",
    );
    for (const group of await groups.all()) {
      assertEquals(await group.locator("input:checked").count(), 1);
    }
    await groups.first().getByRole("radio", { name: "Grid" }).check();
    assertEquals(
      await groups.nth(1).locator('input[value="list"]').isChecked(),
      true,
    );
  } finally {
    await browser.close();
  }
});
