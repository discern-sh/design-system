import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { Button } from "../src/components/core/button/button.tsx";
import { Checkbox } from "../src/components/forms/checkbox/checkbox.tsx";
import {
  Field,
  fieldDescriptionId,
} from "../src/components/forms/field/field.tsx";
import { Input } from "../src/components/forms/input/input.tsx";
import { Radio } from "../src/components/forms/radio/radio.tsx";
import { Select } from "../src/components/forms/select/select.tsx";
import { Switch } from "../src/components/forms/switch/switch.tsx";
import { Textarea } from "../src/components/forms/textarea/textarea.tsx";
import { emitDesignSystemRuntime } from "../src/runtime.ts";

const FORM_COMPONENTS = [
  "field",
  "input",
  "select",
  "textarea",
  "checkbox",
  "radio",
  "switch",
  "button",
] as const;

async function formCss(output: string): Promise<string> {
  await emitDesignSystemRuntime({
    outputRoot: toFileUrl(`${output}/`),
    components: [...FORM_COMPONENTS],
  });
  return await Deno.readTextFile(`${output}/discern.css`);
}

function pageHtml(
  css: string,
  body: string,
  { width, density = 1, rootFontSize }: {
    readonly width?: number;
    readonly density?: number;
    readonly rootFontSize?: number;
  } = {},
): string {
  const rootStyle = `--discern-density:${density}${
    rootFontSize === undefined ? "" : `;font-size:${rootFontSize}px`
  }`;
  const main = width === undefined
    ? body
    : `<main style="width:${width}px">${body}</main>`;
  return `<html data-discern-root style="${rootStyle}"><head><style>${css}</style></head><body>${main}</body></html>`;
}

interface Box {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly height: number;
  readonly width: number;
}

function box(page: Page, selector: string): Promise<Box> {
  return page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      height: rect.height,
      width: rect.width,
    };
  });
}

const periodOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

Deno.test("field rows align mixed labels, controls, helpers, and a neighbouring action", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const row = renderToStaticMarkup(
      <div className="discern-field-row" id="row">
        <Input label="Seats" name="seats" defaultValue="4" hint="Up to 100" />
        <Select
          aria-label="Billing period"
          name="period"
          defaultValue="monthly"
          options={periodOptions}
        />
        <Button type="submit">Add seats</Button>
      </div>,
    );
    for (const density of [0.8, 1.25]) {
      for (const width of [320, 720, 1120]) {
        await page.setContent(pageHtml(css, row, { width, density }));
        const input = await box(page, 'input[name="seats"]');
        const select = await box(page, 'select[name="period"]');
        const button = await box(page, "button");
        const container = await box(page, "#row");
        const facts = JSON.stringify({ density, width, input, select, button });
        // Controls share one row and the shared control-size floor.
        assert(Math.abs(input.top - select.top) <= 1, facts);
        assert(Math.abs(input.top - button.top) <= 1, facts);
        assert(input.height >= 40 && button.height >= 40, facts);
        assert(Math.abs(input.height - button.height) <= 1, facts);
        // The unlabelled control sits level with the labelled control, not
        // with its neighbour's label row above.
        const label = await box(page, ".discern-field__label");
        assert(label.bottom <= input.top, facts);
        // Only the field with a helper extends into the message rows; the
        // row reserves no blank strip beneath helperless columns.
        const hint = await box(page, ".discern-field__message");
        assert(hint.top >= input.bottom, facts);
        assert(container.bottom <= hint.bottom + 1, facts);
        // The row never overflows its allocation.
        const scroll = await page.locator("#row").evaluate((node) =>
          node.scrollWidth
        );
        assert(scroll <= width + 1, facts);
      }
    }
    // Without any helper, the row ends at the control edge instead of
    // reserving an empty message area.
    const bare = renderToStaticMarkup(
      <div className="discern-field-row" id="row">
        <Input label="Seats" name="seats" defaultValue="4" />
        <Button type="submit">Add seats</Button>
      </div>,
    );
    await page.setContent(pageHtml(css, bare, { width: 720 }));
    const input = await box(page, 'input[name="seats"]');
    const container = await box(page, "#row");
    assert(
      Math.abs(container.bottom - input.bottom) <= 1,
      JSON.stringify({ container, input }),
    );
    // A server-rendered error joins the shared message rows without moving
    // any neighbouring control.
    const invalid = renderToStaticMarkup(
      <div className="discern-field-row" id="row">
        <Input
          label="Seats"
          name="seats"
          defaultValue="400"
          hint="Up to 100"
          error="Enter 100 seats or fewer"
        />
        <Select
          aria-label="Billing period"
          name="period"
          defaultValue="monthly"
          options={periodOptions}
        />
        <Button type="submit">Add seats</Button>
      </div>,
    );
    await page.setContent(pageHtml(css, row, { width: 720 }));
    const before = await box(page, 'select[name="period"]');
    await page.setContent(pageHtml(css, invalid, { width: 720 }));
    const after = await box(page, 'select[name="period"]');
    assertEquals(Math.round(before.top), Math.round(after.top));
    const error = await box(page, ".discern-field__message--error");
    const hint = await box(
      page,
      ".discern-field__message:not(.discern-field__message--error)",
    );
    assert(error.top >= after.bottom && hint.top >= error.bottom);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("stacked fields keep the related rhythm between label, control, and messages", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 480, height: 900 },
    });
    const stack = renderToStaticMarkup(
      <>
        <Input
          label="Team name"
          name="team"
          defaultValue="Platform"
          hint="Use at least three characters"
        />
        <Textarea label="About the team" name="about" rows={3} />
      </>,
    );
    await page.setContent(pageHtml(css, stack, { width: 360 }));
    const gap = await page.locator(".discern-field").first().evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).rowGap)
    );
    const related = await page.locator("html").evaluate((node) =>
      Number.parseFloat(
        getComputedStyle(node).getPropertyValue("--discern-rhythm-related"),
      )
    );
    const label = await box(page, "label[for] >> nth=0");
    const input = await box(page, 'input[name="team"]');
    const hint = await box(page, ".discern-field__message");
    const facts = JSON.stringify({ gap, related, label, input, hint });
    assertEquals(gap, related, facts);
    assert(Math.abs(input.top - label.bottom - gap) <= 1, facts);
    assert(Math.abs(hint.top - input.bottom - gap) <= 1, facts);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("validation keeps values, focus, and geometry through failure, correction, and resubmission", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    const form = (error?: string, email = "") =>
      renderToStaticMarkup(
        <form action="https://example.test/submit" method="get">
          <Input
            label="Work email"
            name="email"
            type="email"
            required
            defaultValue={email}
            hint="Use the address invitations are sent to"
            error={error}
          />
          <Input label="City" name="city" defaultValue="Lisbon" />
          <Button type="submit">Save profile</Button>
        </form>,
      );
    await page.setContent(pageHtml(css, form(), { width: 640 }));
    const email = page.locator('input[name="email"]');
    const before = await box(page, 'input[name="email"]');
    const dangerBorder = await email.evaluate((node) => {
      node.style.setProperty("border-color", "var(--discern-color-danger)");
      const value = getComputedStyle(node).borderTopColor;
      node.style.removeProperty("border-color");
      return value;
    });
    // Native constraint validation blocks the submit, marks the control,
    // moves focus to it, and preserves every entered value.
    await page.getByRole("button", { name: "Save profile" }).click();
    assertEquals(page.url().startsWith("https://example.test/"), false);
    assert(await email.evaluate((node) => node.matches(":user-invalid")));
    assertEquals(
      await email.evaluate((node) => getComputedStyle(node).borderTopColor),
      dangerBorder,
    );
    assert(await email.evaluate((node) => node === document.activeElement));
    assertEquals(
      await page.locator('input[name="city"]').inputValue(),
      "Lisbon",
    );
    const during = await box(page, 'input[name="email"]');
    assertEquals(Math.round(before.top), Math.round(during.top));
    // Correcting the value clears the invalid mark locally, without any
    // consumer re-render.
    await email.fill("casey@example.test");
    assertEquals(
      await email.evaluate((node) => node.matches(":user-invalid")),
      false,
    );
    // A server-rendered error message connects programmatically, keeps the
    // hint readable, preserves the value, and never moves the control.
    await page.setContent(
      pageHtml(css, form("Enter an address with an @", "casey"), {
        width: 640,
      }),
    );
    const rendered = await box(page, 'input[name="email"]');
    assertEquals(Math.round(before.top), Math.round(rendered.top));
    assertEquals(await email.getAttribute("aria-invalid"), "true");
    const describedBy = await email.getAttribute("aria-describedby");
    const [errorId, hintId] = (describedBy ?? "").split(" ");
    assert(errorId?.endsWith("-error") && hintId?.endsWith("-hint"));
    const errorText = await page.locator(`[id="${errorId}"]`).textContent();
    assertStringIncludes(errorText ?? "", "Error:");
    assertStringIncludes(errorText ?? "", "Enter an address with an @");
    assert(await page.locator(`[id="${hintId}"]`).isVisible());
    assertEquals(await email.inputValue(), "casey");
    // No package element steals focus when the error renders.
    assert(
      await page.evaluate(() => document.activeElement === document.body),
    );
    // Error removal restores the hint-only relationship.
    await page.setContent(
      pageHtml(css, form(undefined, "casey@example.test"), { width: 640 }),
    );
    assertEquals(await email.getAttribute("aria-invalid"), null);
    assert((await email.getAttribute("aria-describedby"))?.endsWith("-hint"));
    // Resubmission with the corrected value reaches the destination.
    await page.route(
      "https://example.test/submit**",
      (route) => route.fulfill({ body: "Saved" }),
    );
    await Promise.all([
      page.waitForURL("https://example.test/submit**"),
      page.getByRole("button", { name: "Save profile" }).click(),
    ]);
    const submitted = new URL(page.url()).searchParams;
    assertEquals(submitted.get("email"), "casey@example.test");
    assertEquals(submitted.get("city"), "Lisbon");
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

const longWord = "generated-report-retention-policy-appendix";

function choiceSpecimens(): string {
  return renderToStaticMarkup(
    <div className="discern-example-stack">
      <Checkbox
        label={`Keep a local copy of every ${longWord} so reviews stay available offline`}
        description="Copies stay on this device and are removed after thirty days of inactivity."
      />
      <fieldset>
        <legend>Delivery</legend>
        <Radio
          name="delivery"
          value="bundle"
          label="Bundle every artefact into one downloadable archive at the end of the run"
          description="Slower to appear, but a single file to fetch."
          defaultChecked
        />
        <Radio
          name="delivery"
          value="stream"
          label="Stream artefacts as they finish"
        />
      </fieldset>
      <Switch
        label="Pause non-essential background work while a presentation is being recorded"
        description="Scheduled maintenance keeps running."
      />
    </div>,
  );
}

async function firstLineCenter(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getClientRects()[0];
    if (rect === undefined) throw new Error("no line box");
    return rect.top + rect.height / 2;
  });
}

Deno.test("choice indicators align to the first label line and text stays contained at high zoom", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 720, height: 1200 },
    });
    for (const rootFontSize of [16, 24]) {
      for (const width of [240, 320, 560]) {
        await page.setContent(
          pageHtml(css, choiceSpecimens(), { width, rootFontSize }),
        );
        const tolerance = rootFontSize / 8;
        const facts = `root ${rootFontSize}px, width ${width}px`;
        // Checkbox and radio indicators centre on the first line of their
        // multiline labels.
        for (
          const [control, text] of [
            [
              ".discern-choice:not(.discern-choice--radio) .discern-choice__control",
              ".discern-choice:not(.discern-choice--radio) .discern-choice__label > span:last-child",
            ],
            [
              '.discern-choice--radio:has(input[value="bundle"]) .discern-choice__control',
              '.discern-choice--radio:has(input[value="bundle"]) .discern-choice__label > span:last-child',
            ],
          ] as const
        ) {
          const indicator = await box(page, control);
          const line = await firstLineCenter(page, text);
          assert(
            Math.abs((indicator.top + indicator.height / 2) - line) <=
              tolerance,
            `${facts}: ${control} centre ${
              indicator.top + indicator.height / 2
            } vs line ${line}`,
          );
        }
        // The switch track holds to the first line instead of floating
        // beside the whole text block.
        const track = await box(page, ".discern-switch__track");
        const switchLine = await firstLineCenter(
          page,
          ".discern-switch__text",
        );
        assert(
          Math.abs((track.top + track.height / 2) - switchLine) <= tolerance,
          `${facts}: track vs first line`,
        );
        // Descriptions share the label text column exactly.
        for (const kind of ["", "--radio"]) {
          const selector = kind === ""
            ? ".discern-choice:not(.discern-choice--radio)"
            : '.discern-choice--radio:has(input[value="bundle"])';
          const description = await box(
            page,
            `${selector} .discern-choice__description`,
          );
          const text = await box(
            page,
            `${selector} .discern-choice__label > span:last-child`,
          );
          assert(
            Math.abs(description.left - text.left) <= 1,
            `${facts}: description column ${description.left} vs ${text.left}`,
          );
        }
        // Long tokens never force a horizontal scroll.
        const scroll = await page.locator("main").evaluate((node) =>
          node.scrollWidth <= node.clientWidth + 1
        );
        assert(scroll, `${facts}: contained`);
        // Every labelled region stays a generous target.
        for (
          const selector of [
            ".discern-choice__label",
            ".discern-switch__label",
          ]
        ) {
          const target = await box(page, `${selector} >> nth=0`);
          assert(target.height >= 24, `${facts}: ${selector} target height`);
        }
      }
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("multiline choices stay usable by label click, keyboard, and forced colours", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 480, height: 1200 },
    });
    await page.setContent(
      pageHtml(css, choiceSpecimens(), { width: 320 }),
    );
    const checkbox = page.locator(
      ".discern-choice:not(.discern-choice--radio) input",
    );
    // Clicking the wrapped label text, the indicator, and the trailing
    // whitespace of the labelled row all toggle the control.
    await page.locator(
      ".discern-choice:not(.discern-choice--radio) .discern-choice__label > span:last-child",
    ).click();
    assert(await checkbox.isChecked());
    await page.locator(
      ".discern-choice:not(.discern-choice--radio) .discern-choice__label",
    ).click({ position: { x: 300, y: 8 } });
    assertEquals(await checkbox.isChecked(), false);
    const labelBox = await box(
      page,
      ".discern-choice:not(.discern-choice--radio) .discern-choice__label",
    );
    await page.mouse.click(labelBox.left + 9, labelBox.top + 9);
    assert(await checkbox.isChecked());
    // Keyboard operation retains native semantics: Space toggles the
    // checkbox, arrows move the radio selection, Space toggles the switch.
    await checkbox.focus();
    await page.keyboard.press("Space");
    assertEquals(await checkbox.isChecked(), false);
    const outline = await page.locator(
      ".discern-choice:not(.discern-choice--radio) .discern-choice__control",
    ).evaluate((node) => getComputedStyle(node).outlineStyle);
    assertEquals(outline, "solid");
    await page.locator('input[value="bundle"]').focus();
    await page.keyboard.press("ArrowDown");
    assert(await page.locator('input[value="stream"]').isChecked());
    const switchInput = page.locator('[role="switch"]');
    await switchInput.focus();
    await page.keyboard.press("Space");
    assert(await switchInput.isChecked());
    // Forced colours keep the selected radio dot, the switch thumb, and
    // focus visibility, so state never disappears with stripped backgrounds.
    await page.emulateMedia({ forcedColors: "active" });
    const dot = await page.locator(
      '.discern-choice--radio:has(input[value="stream"]) .discern-choice__control > span',
    ).evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        dot: style.backgroundColor,
        well: getComputedStyle(node.parentElement!).backgroundColor,
      };
    });
    assert(dot.dot !== "rgba(0, 0, 0, 0)" && dot.dot !== dot.well, dot.dot);
    const thumb = await page.locator(".discern-switch__track > span")
      .evaluate((node) => ({
        thumb: getComputedStyle(node).backgroundColor,
        track: getComputedStyle(node.parentElement!).backgroundColor,
      }));
    assert(thumb.thumb !== "rgba(0, 0, 0, 0)" && thumb.thumb !== thumb.track);
    await checkbox.focus();
    const ring = await page.locator(
      ".discern-choice:not(.discern-choice--radio) .discern-choice__control",
    ).evaluate((node) => ({
      width: getComputedStyle(node).outlineWidth,
      style: getComputedStyle(node).outlineStyle,
    }));
    assertEquals(ring, { width: "2px", style: "solid" });
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("field messaging wires invalid, described-by, and witness relationships in static output", () => {
  const both = renderToStaticMarkup(
    <Input
      id="report"
      label="Report name"
      hint="Shown in the directory"
      error="Use at least three characters"
      defaultValue="a"
    />,
  );
  assertStringIncludes(both, 'aria-invalid="true"');
  assertStringIncludes(both, 'aria-describedby="report-error report-hint"');
  assertStringIncludes(both, 'id="report-error"');
  assertStringIncludes(both, 'id="report-hint"');
  assertStringIncludes(both, "Error:");
  assert(
    both.indexOf("report-error") < both.indexOf("report-hint"),
    "the error message precedes the hint",
  );
  assertEquals(fieldDescriptionId("report", undefined, undefined), undefined);
  assertEquals(fieldDescriptionId("report", "hint", undefined), "report-hint");
  assertEquals(fieldDescriptionId("report", undefined, "bad"), "report-error");
  assertEquals(
    fieldDescriptionId("report", "hint", "bad"),
    "report-error report-hint",
  );
  for (
    const control of [
      renderToStaticMarkup(
        <Select
          id="region"
          label="Region"
          error="Choose a region"
          hint="Sets times"
          options={[{ value: "eu", label: "Europe" }]}
        />,
      ),
      renderToStaticMarkup(
        <Textarea id="about" label="About" error="Too short" hint="Optional" />,
      ),
    ]
  ) {
    assertStringIncludes(control, 'aria-invalid="true"');
    assertStringIncludes(control, "-error");
    assertStringIncludes(control, "-hint");
  }
  const custom = renderToStaticMarkup(
    <Field
      controlId="widget"
      label="Widget"
      hint="Pick one"
      error="Unavailable"
    >
      <div id="widget" className="discern-control" />
    </Field>,
  );
  assertStringIncludes(custom, 'id="widget-error"');
  assertStringIncludes(custom, 'id="widget-hint"');
  const described = renderToStaticMarkup(
    <Checkbox id="keep" label="Keep copies" description="Removed monthly" />,
  );
  assertStringIncludes(described, 'aria-describedby="keep-description"');
  assertStringIncludes(described, 'id="keep-description"');
});
