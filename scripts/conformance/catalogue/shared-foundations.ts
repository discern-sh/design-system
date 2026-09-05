import type { Page } from "playwright-core";
import { baseTokens } from "../../../src/tokens/tokens.ts";
import { invariant } from "./support.ts";

/** Measure composed controls and spacing after the real browser cascade. */
export async function verifySharedFoundations(page: Page): Promise<void> {
  const study = page.locator("#shared-foundations");
  const sizes = baseTokens.filter(({ name }) =>
    name.startsWith("--discern-control-size-")
  );
  for (const density of [0.5, 1, 2]) {
    for (const fontSize of [16, 20]) {
      await study.evaluate((_node, point) => {
        document.documentElement.style.fontSize = `${point.fontSize}px`;
        document.querySelector<HTMLElement>(".discern-catalogue-shell")!.style
          .setProperty("--discern-density", String(point.density));
      }, { density, fontSize });
      const geometry = await study.evaluate((node) => {
        const controls = [
          ...node.querySelectorAll("form :is(input, select, button)"),
        ];
        return controls.map((control) => {
          const rect = control.getBoundingClientRect();
          return { height: rect.height, bottom: rect.bottom };
        });
      });
      invariant(
        geometry.length === 4 &&
          geometry.every(({ height, bottom }) =>
            Math.abs(height - geometry[0]!.height) < 0.1 &&
            Math.abs(bottom - geometry[0]!.bottom) < 0.1 &&
            height >= Math.max(2.5 * fontSize, 40 * density) - 0.1
          ),
        `Shared controls must align and retain their floor at density ${density}, root ${fontSize}: ${
          JSON.stringify(geometry)
        }`,
      );
      for (const { name } of sizes) {
        const size = name.slice("--discern-control-size-".length);
        const dimensions = await study.locator(
          `[data-discern-control-study-size="${size}"]`,
        ).evaluate((node) =>
          [...node.querySelectorAll("button")].map((button) => {
            const { height, width } = button.getBoundingClientRect();
            return { height, width };
          })
        );
        invariant(
          dimensions.length === 2 &&
            Math.abs(dimensions[0]!.height - dimensions[1]!.height) < 0.1 &&
            Math.abs(dimensions[1]!.height - dimensions[1]!.width) < 0.1,
          `${size} action sizes must align and Icon button must remain square`,
        );
      }
    }
  }
  await study.evaluate((node) => {
    document.documentElement.style.removeProperty("font-size");
    document.querySelector<HTMLElement>(".discern-catalogue-shell")!.style
      .removeProperty("--discern-density");
    node.style.setProperty("--discern-control-size-md", "57px");
  });
  const overridden = await study.locator("form :is(input, select, button)")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height)
    );
  invariant(
    overridden.every((height) => Math.abs(height - 57) < 0.1),
    "Every default control must follow a consumer's shared size override",
  );
  await study.evaluate((node) =>
    node.style.removeProperty("--discern-control-size-md")
  );
  const hierarchy = await page.evaluate(() => {
    const study = document.querySelector("#shared-foundations")!;
    const selectors = [
      ".discern-catalogue-page__header h1",
      "#shared-foundations-title",
      "#shared-foundations h3",
      "#shared-foundations .discern-field__label",
      ".discern-catalogue-foundation-study__meta",
    ];
    const sizes = selectors.map((selector) =>
      parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)
    );
    const stacks = [...study.querySelectorAll(".discern-stack")];
    const gaps = stacks.flatMap((stack) => {
      const children = [...stack.children];
      const gap = parseFloat(getComputedStyle(stack).rowGap);
      return children.slice(1).map((child, index) => ({
        expected: gap,
        actual: child.getBoundingClientRect().top -
          children[index]!.getBoundingClientRect().bottom,
      }));
    });
    const nested = getComputedStyle(
      study.querySelector(".discern-card .discern-card")!,
    );
    return {
      sizes,
      gaps,
      nestedShadow: nested.boxShadow,
      nestedBorder: nested.borderTopWidth,
    };
  });
  invariant(
    hierarchy.sizes.every((size, index) =>
      index === 0 || size < hierarchy.sizes[index - 1]!
    ),
    "Page, section, component, label, and metadata roles need distinct sizes",
  );
  invariant(
    hierarchy.gaps.every(({ expected, actual }) =>
      Math.abs(expected - actual) < 0.1
    ),
    "Stack gaps must own rhythm without added child margins",
  );
  invariant(
    hierarchy.nestedShadow === "none" &&
      hierarchy.nestedBorder === "0px",
    "Nested cards must not stack elevation and borders",
  );
  await study.getByRole("button", { name: "Apply", exact: true }).click();
  invariant(
    await study.getByRole("status").textContent() ===
      "Preferences applied for this preview.",
    "Foundation form should submit in place",
  );
  await study.getByRole("button", { name: "Reset preferences", exact: true })
    .click();
}
