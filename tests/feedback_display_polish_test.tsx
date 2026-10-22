import { assert, assertEquals } from "@std/assert";
import { toFileUrl } from "@std/path";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { Badge } from "../src/components/display/badge/badge.tsx";
import { Card } from "../src/components/display/card/card.tsx";
import { Divider } from "../src/components/display/divider/divider.tsx";
import { Heading } from "../src/components/display/heading/heading.tsx";
import { Table } from "../src/components/display/table/table.tsx";
import { Tag } from "../src/components/display/tag/tag.tsx";
import { FeedbackMark } from "../src/components/feedback/feedback-marks.tsx";
import { Toast } from "../src/components/feedback/toast/toast.tsx";
import { componentRegistry } from "../src/generated/component-registry.ts";

Deno.test("Badge leads each notice tone with the mark Banner and Toast draw", () => {
  for (const tone of ["success", "warning", "danger"] as const) {
    const html = renderToStaticMarkup(<Badge tone={tone} dot>Label</Badge>);
    assert(
      html.includes(renderToStaticMarkup(<FeedbackMark name={tone} />)),
      `${tone} Badge draws the ${tone} feedback mark`,
    );
    assert(!html.includes("discern-badge__dot"), `${tone} keeps no CSS dot`);
    assert(html.includes("discern-badge__mark"), `${tone} wraps its mark`);
  }
  for (const tone of ["accent", "neutral"] as const) {
    const html = renderToStaticMarkup(<Badge tone={tone} dot>Label</Badge>);
    assert(html.includes("discern-badge__dot"), `${tone} keeps its dot`);
    assert(!html.includes("<svg"), `${tone} draws no notice mark`);
  }
});

Deno.test("Divider renders only classes its stylesheet owns", () => {
  const owned = new Set<string>(
    componentRegistry.find(({ meta }) => meta.slug === "divider")!
      .ownedClasses,
  );
  for (
    const html of [
      renderToStaticMarkup(<Divider />),
      renderToStaticMarkup(<Divider surface="surface" label="Section" />),
    ]
  ) {
    for (const [, classes] of html.matchAll(/class="([^"]*)"/g)) {
      for (const name of classes!.split(/\s+/)) {
        assert(owned.has(name), `Divider renders unstyled ${name}`);
      }
    }
  }
});

Deno.test("chips, headings, tables and toasts keep their geometry and emphasis in both themes", async () => {
  const browser = await launchBrowser();
  const output = await Deno.makeTempDir();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      components: ["badge", "card", "heading", "table", "tag", "toast"],
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const page = await browser.newPage({
      viewport: { width: 900, height: 900 },
    });
    const longCopy =
      "A wrapped notification keeps its mark and dismiss on the first line of its message.";
    const html = [
      `<div data-case="chips" style="width:7rem">${
        renderToStaticMarkup(
          <>
            <Tag>International correspondence</Tag>
            <Badge tone="danger" dot>Several failed checks</Badge>
          </>,
        )
      }</div>`,
      `<div data-case="remove">${
        renderToStaticMarkup(
          <Tag onRemove={() => {}} removeLabel="Remove metadata">
            Metadata
          </Tag>,
        )
      }</div>`,
      renderToStaticMarkup(
        <Heading level={2}>
          A <strong>complete</strong> heading keeps <code>inline meaning</code>
        </Heading>,
      ),
      renderToStaticMarkup(
        <Card>
          <h3>
            A <strong>complete</strong> title
          </h3>
        </Card>,
      ),
      renderToStaticMarkup(
        <Table striped>
          <thead>
            <tr>
              <th scope="col">2024</th>
              <th scope="col">Duration</th>
              <th scope="col">Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>11</td>
              <td>8m 04s</td>
              <td>
                Inline <code>semantics</code>
              </td>
            </tr>
          </tbody>
        </Table>,
      ),
      `<p data-case="inline">Status ${
        renderToStaticMarkup(
          <>
            <Badge>Plain</Badge> <Badge dot>Active</Badge>{" "}
            <Badge tone="neutral" dot>Queued</Badge>{" "}
            <Badge tone="danger" dot>Failed</Badge>
          </>,
        )
      } in a sentence</p>`,
      `<span data-case="mono" style="font-family:var(--discern-font-mono)">mono</span>`,
      `<div data-case="toast-single">${
        renderToStaticMarkup(
          <Toast tone="success" onDismiss={() => {}}>Saved.</Toast>,
        )
      }</div>`,
      `<div data-case="toast-wrapped" style="width:18rem">${
        renderToStaticMarkup(
          <Toast tone="warning" onDismiss={() => {}}>{longCopy}</Toast>,
        )
      }</div>`,
    ].join("");
    for (const theme of ["light", "dark"]) {
      await page.setContent(
        `<!doctype html><html data-discern-root data-discern-theme="${theme}"><head><style>${css}</style></head><body><main>${html}</main></body></html>`,
      );

      const chips = await page.locator('[data-case="chips"] > *').evaluateAll(
        (nodes) =>
          nodes.map((node) => {
            const style = getComputedStyle(node);
            const box = node.getBoundingClientRect();
            const border = parseFloat(style.borderTopWidth);
            const radius = parseFloat(style.borderTopLeftRadius);
            const range = document.createRange();
            const text = [...node.childNodes].find((child) =>
              child.nodeType === Node.TEXT_NODE
            )!;
            range.selectNodeContents(text);
            const inside = (x: number, y: number) => {
              const left = box.left + border, right = box.right - border;
              const top = box.top + border, bottom = box.bottom - border;
              if (x < left - 0.5 || x > right + 0.5) return false;
              if (y < top - 0.5 || y > bottom + 0.5) return false;
              const r = Math.max(0, radius - border);
              const cx = x < left + r
                ? left + r
                : x > right - r
                ? right - r
                : x;
              const cy = y < top + r
                ? top + r
                : y > bottom - r
                ? bottom - r
                : y;
              return Math.hypot(x - cx, y - cy) <= r + 0.5;
            };
            const lines = [...range.getClientRects()];
            return {
              name: node.className,
              lines: lines.length,
              halfLine: radius <= parseFloat(style.minBlockSize) / 2 + 0.01,
              contained: lines.every((line) =>
                inside(line.left, line.top) && inside(line.right, line.top) &&
                inside(line.left, line.bottom) &&
                inside(line.right, line.bottom)
              ),
            };
          }),
      );
      for (const chip of chips) {
        assert(chip.lines > 1, `${theme}: ${chip.name} wraps in the fixture`);
        assert(chip.halfLine, `${theme}: ${chip.name} radius exceeds a line`);
        assert(chip.contained, `${theme}: ${chip.name} corners clip its text`);
      }

      await page.locator('[data-case="remove"]').evaluate((node) =>
        node.insertAdjacentHTML("afterbegin", "<button>before</button>")
      );
      await page.getByRole("button", { name: "before" }).focus();
      await page.keyboard.press("Tab");
      const ring = await page.locator('[data-case="remove"] .discern-tag')
        .evaluate((tag) => {
          const remove = tag.querySelector("button")!;
          const range = document.createRange();
          range.selectNodeContents(tag.firstChild!);
          const label = range.getBoundingClientRect();
          const box = tag.getBoundingClientRect();
          const target = remove.getBoundingClientRect();
          return {
            focused: document.activeElement === remove &&
              remove.matches(":focus-visible"),
            removeOutline: getComputedStyle(remove).outlineStyle,
            tagOutline: parseFloat(getComputedStyle(tag).outlineWidth),
            targetInside: target.left >= box.left &&
              target.right <= box.right &&
              target.top >= box.top && target.bottom <= box.bottom,
            labelClear: label.right < target.left,
          };
        });
      assert(ring.focused, `${theme}: the remover takes keyboard focus`);
      assertEquals(ring.removeOutline, "none");
      assert(ring.tagOutline > 0, `${theme}: the chip draws the focus ring`);
      assert(ring.targetInside, `${theme}: the remover stays inside the chip`);
      assert(ring.labelClear, `${theme}: the remover overlaps the label`);

      const emphasis = await page.locator("strong").evaluateAll((nodes) =>
        nodes.map((node) => ({
          own: Number(getComputedStyle(node).fontWeight),
          parent: Number(getComputedStyle(node.parentElement!).fontWeight),
        }))
      );
      assertEquals(emphasis.length, 2);
      for (const { own, parent } of emphasis) {
        assert(
          own > parent,
          `${theme}: strong ${own} inside a ${parent} title`,
        );
      }
      const tops = await page.locator('[data-case="inline"] .discern-badge')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().top)
        );
      assertEquals(tops.length, 4);
      assert(
        Math.max(...tops) - Math.min(...tops) <= 0.5,
        `${theme}: a leading mark moves its Badge off the text baseline: ${tops}`,
      );

      const mono = await page.locator('[data-case="mono"]').evaluate((node) =>
        getComputedStyle(node).fontFamily
      );
      const codeFaces = await page.locator("main code").evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).fontFamily)
      );
      assertEquals(codeFaces, [mono, mono], `${theme}: inline code face`);

      const figures = await page.locator(".discern-table :is(th, td)")
        .evaluateAll((cells) =>
          cells.map((cell) => getComputedStyle(cell).fontVariantNumeric)
        );
      assertEquals(new Set(figures), new Set(["tabular-nums"]));

      const toasts = await page.locator(".discern-toast").evaluateAll((nodes) =>
        nodes.map((toast) => {
          const content = toast.querySelector(".discern-toast__content")!;
          const range = document.createRange();
          range.selectNodeContents(content);
          const first = range.getClientRects()[0]!;
          const lineCentre = (first.top + first.bottom) / 2;
          const centre = (selector: string) => {
            const rect = toast.querySelector(selector)!.getBoundingClientRect();
            return (rect.top + rect.bottom) / 2;
          };
          const box = toast.getBoundingClientRect();
          return {
            lines: range.getClientRects().length,
            height: box.height,
            boxCentre: (box.top + box.bottom) / 2,
            lineCentre,
            icon: centre(".discern-toast__icon svg"),
            dismiss: centre(".discern-toast__dismiss"),
          };
        })
      );
      const [single, wrapped] = toasts;
      assert(single && wrapped);
      assertEquals(single.lines, 1);
      assert(wrapped.lines > 1, `${theme}: the wrapped fixture wraps`);
      assert(
        Math.abs(single.lineCentre - single.boxCentre) <= 1,
        `${theme}: a single-line toast centres its message`,
      );
      for (const toast of toasts) {
        assert(
          Math.abs(toast.icon - toast.lineCentre) <= 1,
          `${theme}: the tone mark sits on the first line`,
        );
        assert(
          Math.abs(toast.dismiss - toast.lineCentre) <= 1,
          `${theme}: the dismiss sits on the first line`,
        );
      }
      assert(wrapped.height > single.height);
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
