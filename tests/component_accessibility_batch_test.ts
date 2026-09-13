import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { launchBrowser } from "../scripts/browser.ts";
import { scanComponentAccessibility } from "../scripts/conformance/catalogue/components.ts";

Deno.test("Component accessibility batches retain every target, theme, and incomplete batch", async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const components = Array.from(
    { length: 25 },
    (_, index) => `future-${index}`,
  );
  try {
    await page.setContent(
      `<style>button { min-width: 40px; min-height: 40px; }</style><main>${
        components.map((id) => `
      <section data-discern-component="${id}">
        <div class="discern-catalogue-component__canvas">
          <button id="${id}"></button>
          <span id="contrast-${id}" style="color:#aaa; background:white">Low contrast</span>
        </div>
      </section>`).join("")
      }</main>`,
    );
    for (const theme of ["light", "dark"] as const) {
      const failures: string[] = [];
      const scans = await scanComponentAccessibility(
        page,
        theme,
        components,
        failures,
      );
      for (const id of components) {
        assertStringIncludes(failures.join("\n"), `"#${id}"`);
        assertStringIncludes(failures.join("\n"), `"#contrast-${id}"`);
      }
      assert(failures.every((failure) => failure.startsWith(`${theme}/`)));
      assertStringIncludes(failures.join("\n"), "button-name");
      assertStringIncludes(failures.join("\n"), "color-contrast");
      assert(
        scans < components.length / 2,
        `${scans} scans repeated population setup`,
      );
    }

    const missing: string[] = [];
    await scanComponentAccessibility(page, "light", [
      ...components,
      "absent-sibling",
    ], missing);
    assertStringIncludes(missing.join("\n"), "absent-sibling");
    assertStringIncludes(missing.join("\n"), "scan failed");

    await page.locator("button").evaluateAll((buttons) => {
      for (const button of buttons) button.textContent = "Named action";
    });
    await page.locator("span").evaluateAll((spans) => {
      for (const span of spans) span.style.color = "black";
    });
    await page.locator("main").evaluate((main) => {
      const outside = document.createElement("button");
      outside.id = "outside-requested-canvases";
      main.append(outside);
    });
    const repaired: string[] = [];
    await scanComponentAccessibility(page, "dark", components, repaired);
    assertEquals(repaired, []);
  } finally {
    await context.close();
    await browser.close();
  }
});
