import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Page } from "playwright-core";
import { launchBrowser } from "../scripts/browser.ts";
import { expectUrl } from "../scripts/browser-url.ts";
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
    const related = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.marginBlockStart = "var(--discern-rhythm-related)";
      document.body.append(probe);
      const value = Number.parseFloat(getComputedStyle(probe).marginTop);
      probe.remove();
      return value;
    });
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
    // Deterministic colours: reduced motion still leaves a 0.01ms
    // transition a same-frame read can catch, so this page removes
    // transitions entirely.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settled = `${css} [data-discern-root] *{transition:none!important}`;
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
    await page.setContent(pageHtml(settled, form(), { width: 640 }));
    const email = page.locator('input[name="email"]');
    const before = await box(page, 'input[name="email"]');
    const dangerBorder = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.borderTop = "1px solid var(--discern-color-danger)";
      document.body.append(probe);
      const value = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return value;
    });
    // Native constraint validation blocks the submit, marks the control,
    // moves focus to it, and preserves every entered value.
    await page.getByRole("button", { name: "Save profile" }).click();
    await expectUrl(
      page,
      (url) => url.href === "about:blank",
      "An invalid submission left the form",
    );
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
      pageHtml(settled, form("Enter an address with an @", "casey"), {
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
      pageHtml(settled, form(undefined, "casey@example.test"), { width: 640 }),
    );
    assertEquals(await email.getAttribute("aria-invalid"), null);
    assert((await email.getAttribute("aria-describedby"))?.endsWith("-hint"));
    // Resubmission with the corrected value reaches the destination.
    await page.route(
      "https://example.test/submit**",
      (route) => route.fulfill({ body: "Saved" }),
    );
    await page.getByRole("button", { name: "Save profile" }).click();
    const submitted = (await expectUrl(
      page,
      (url) => url.href.startsWith("https://example.test/submit?"),
      "The corrected submission did not reach its destination",
    )).searchParams;
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

Deno.test("semantic state outranks hover, and native fields carry an invalid shape", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settled = `${css} [data-discern-root] *{transition:none!important}`;
    const specimens = renderToStaticMarkup(
      <div className="discern-example-stack">
        <div id="checked">
          <Checkbox label="Checked" defaultChecked />
        </div>
        <div id="invalid-choice">
          <Checkbox label="Invalid" aria-invalid="true" />
        </div>
        <div id="checked-switch">
          <Switch label="On" defaultChecked />
        </div>
        <div id="invalid-switch">
          <Switch label="Invalid" aria-invalid="true" />
        </div>
        <div id="invalid-input">
          <Input label="Name" defaultValue="a" error="Too short" />
        </div>
        <div id="valid-input">
          <Input label="City" defaultValue="Lisbon" />
        </div>
        <div id="resting-choice">
          <Checkbox label="Resting" />
        </div>
        <div id="resting-switch">
          <Switch label="Off" />
        </div>
      </div>,
    );
    await page.setContent(pageHtml(settled, specimens, { width: 640 }));
    const edge = (selector: string) =>
      page.locator(selector).evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          color: style.borderTopColor,
          width: style.borderTopWidth,
          lower: style.borderBottomWidth,
          outline:
            `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
        };
      });
    // Hover feedback never replaces a checked or invalid edge.
    for (
      const [hoverTarget, paint] of [
        ["#checked label", "#checked .discern-choice__control"],
        ["#invalid-choice label", "#invalid-choice .discern-choice__control"],
        ["#checked-switch label", "#checked-switch .discern-switch__track"],
        ["#invalid-switch label", "#invalid-switch .discern-switch__track"],
        ["#invalid-input input", "#invalid-input input"],
      ] as const
    ) {
      await page.mouse.move(0, 0);
      const before = await edge(paint);
      await page.hover(hoverTarget);
      assertEquals(await edge(paint), before, `${paint} changed on hover`);
    }
    // Hover still answers on resting controls, so the guard above is not
    // passing merely because hover styling disappeared.
    for (
      const [hoverTarget, paint] of [
        ["#valid-input input", "#valid-input input"],
        ["#resting-choice label", "#resting-choice .discern-choice__control"],
        ["#resting-switch label", "#resting-switch .discern-switch__track"],
      ] as const
    ) {
      await page.mouse.move(0, 0);
      const resting = await edge(paint);
      await page.hover(hoverTarget);
      assert((await edge(paint)).color !== resting.color, paint);
    }
    // An invalid native field weights its lower edge, a shape the focus ring
    // never takes, instead of changing darkness alone, and adds no layout.
    const danger = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "var(--discern-color-danger)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    await page.mouse.move(0, 0);
    const invalid = await edge("#invalid-input input");
    assertEquals(invalid.color, danger);
    assertEquals({ width: invalid.width, lower: invalid.lower }, {
      width: "1px",
      lower: "2px",
    });
    assert(invalid.outline.startsWith("none"), invalid.outline);
    const valid = await box(page, "#valid-input input");
    const marked = await box(page, "#invalid-input input");
    assertEquals(Math.round(marked.height), Math.round(valid.height));
    // Keyboard focus adds the shared ring around the whole field, so focus
    // always out-ranks the invalid mark.
    await page.locator("#invalid-input input").focus();
    const focused = await edge("#invalid-input input");
    assertEquals(focused.color, danger);
    assert(focused.outline.startsWith("solid 2px"), focused.outline);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("Field groups replace the browser fieldset frame and describe the whole group", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    const group = (disabled: boolean) =>
      renderToStaticMarkup(
        <Field
          group
          controlId="channel"
          label="Channel"
          hint="Pick one"
          error="Choose a channel"
          disabled={disabled}
        >
          <Radio name="channel" label="Alpha" />
          <Radio name="channel" label="Bravo" />
        </Field>,
      );
    const markup = group(false);
    assertStringIncludes(markup, "<fieldset");
    assertStringIncludes(markup, 'aria-invalid="true"');
    assertStringIncludes(
      markup,
      'aria-describedby="channel-error channel-hint"',
    );
    assertStringIncludes(markup, '<legend class="discern-field__label"');
    await page.setContent(pageHtml(css, markup, { width: 480 }));
    const frame = await page.locator("fieldset").evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        border: style.borderTopWidth,
        padding: style.paddingTop,
        margin: style.marginInlineStart,
        gap: Number.parseFloat(style.rowGap),
      };
    });
    assertEquals(
      { border: frame.border, padding: frame.padding, margin: frame.margin },
      { border: "0px", padding: "0px", margin: "0px" },
    );
    // The legend joins the Field rhythm instead of notching a frame.
    const legend = await box(page, "legend");
    const first = await box(page, ".discern-choice >> nth=0");
    assert(
      Math.abs(first.top - legend.bottom - frame.gap) <= 1,
      JSON.stringify({ legend, first, gap: frame.gap }),
    );
    // A group-level error marks every enabled option with the shaped edge.
    const optionEdge = await page.locator(".discern-choice__control >> nth=0")
      .evaluate((node) => getComputedStyle(node).borderTopWidth);
    assertEquals(optionEdge, "2px");
    // A disabled group mutes its legend like any unavailable Field label.
    const ink = (selector: string) =>
      page.locator(selector).evaluate((node) => getComputedStyle(node).color);
    const enabledInk = await ink("legend");
    await page.setContent(pageHtml(css, group(true), { width: 480 }));
    assert(await page.getByRole("radio", { name: "Alpha" }).isDisabled());
    assert((await ink("legend")) !== enabledInk);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("choice indicators meet non-text contrast and group errors reach every proxy", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    // Theme switches below must not be read mid-transition.
    const css = `${await formCss(output)}
      [data-discern-root] *{transition:none!important}`;
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    await page.setContent(pageHtml(
      css,
      renderToStaticMarkup(
        <div className="discern-example-stack">
          <Checkbox label="Resting" />
          <Field group controlId="channel" label="Channel">
            <Radio name="channel" label="Alpha" />
          </Field>
          <Switch label="Off" />
          <Field
            group
            controlId="preferences"
            label="Preferences"
            error="Turn one on"
          >
            <Switch label="Updates" />
            <Switch label="Digest" disabled />
          </Field>
        </div>,
      ),
      { width: 640 },
    ));
    // WCAG 1.4.11: an unchecked indicator's boundary identifies the control,
    // so it holds 3:1 against the surface it sits on in both themes.
    const grounds = new Set<number>();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.discernTheme = value;
      }, theme);
      const { base, ratios } = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        const resolve = (value: string) => {
          const probe = document.createElement("div");
          probe.style.color = value;
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const luminance = (layers: readonly string[]) => {
          context.clearRect(0, 0, 1, 1);
          for (const layer of layers) {
            context.fillStyle = layer;
            context.fillRect(0, 0, 1, 1);
          }
          const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
          const linear = (channel: number) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
        };
        const ground = [
          resolve("var(--discern-color-canvas)"),
          resolve("var(--discern-color-surface)"),
        ];
        const base = luminance(ground);
        return {
          base,
          ratios: [
            ".discern-choice:not(.discern-choice--radio) .discern-choice__control",
            ".discern-choice--radio .discern-choice__control",
            ".discern-switch__track",
          ].map((selector) => {
            const edge = getComputedStyle(document.querySelector(selector)!)
              .borderTopColor;
            const ink = luminance([...ground, edge]);
            return {
              selector,
              ratio: (Math.max(base, ink) + 0.05) /
                (Math.min(base, ink) + 0.05),
            };
          }),
        };
      });
      grounds.add(Math.round(base * 1000));
      for (const { selector, ratio } of ratios) {
        assert(
          ratio >= 3,
          `${theme} ${selector} boundary ${ratio.toFixed(2)}:1`,
        );
      }
    }
    assertEquals(grounds.size, 2, "both themes were measured");
    // A group-level error gives every enabled Switch its shaped danger edge.
    const tracks = await page.locator(
      "#preferences .discern-switch__track",
    ).evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).borderTopWidth)
    );
    assertEquals(tracks, ["2px", "1px"]);
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("a nested Field group is an explicit subgroup bound to its own options", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    const css = await formCss(output);
    const page = await browser.newPage({
      viewport: { width: 720, height: 900 },
    });
    const markup = renderToStaticMarkup(
      <>
        <Field group controlId="notifications" label="Notifications">
          <Field group controlId="regular" label="Regular">
            <Checkbox label="Email updates" />
            <Checkbox label="Weekly summary" />
          </Field>
          <Field group controlId="optional" label="Optional">
            <Checkbox label="Announcements" />
          </Field>
        </Field>
        <Field group controlId="sibling" label="Sibling">
          <Checkbox label="Standalone" />
        </Field>
      </>,
    );
    await page.setContent(pageHtml(css, markup, { width: 480 }));
    const subgroups = await page.locator("fieldset").evaluateAll((nodes) =>
      nodes.map((node) => [
        node.id,
        node.classList.contains("discern-field--subgroup"),
      ])
    );
    assertEquals(subgroups, [
      ["notifications", false],
      ["regular", true],
      ["optional", true],
      ["sibling", false],
    ]);
    // Proximity binds a subgroup legend to its options, not to its parent.
    const parent = await box(page, "#notifications > legend");
    const regular = await box(page, "#regular > legend");
    const option = await box(page, "#regular .discern-choice >> nth=0");
    const optional = await box(page, "#optional > legend");
    const lastRegular = await box(page, "#regular .discern-choice >> nth=1");
    assert(option.top - regular.bottom < regular.top - parent.bottom);
    assert(option.top - regular.bottom < optional.top - lastRegular.bottom);
    // Adjacent top-level groups keep the parent stack's spacing alone.
    const sibling = await page.locator("#sibling").evaluate((node) =>
      getComputedStyle(node).marginBlockStart
    );
    assertEquals(sibling, "0px");
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
