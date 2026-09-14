import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, toFileUrl } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { launchBrowser } from "../scripts/browser.ts";
import { withViewport } from "../scripts/viewport.ts";
import { buildSignatureConsumer } from "../scripts/signature-consumer.tsx";
import { emitDesignSystemRuntime } from "../src/runtime.ts";
import { componentGroups } from "../src/types/component-meta.ts";
import { compositionGalleryItems } from "../catalogue/pages/compositions/page.tsx";
import { compositionSearchRecords } from "../catalogue/routes/compositions.ts";
import { SignatureSpecimen } from "../catalogue/compositions/signature-specimens.tsx";
import { compositionRecipes } from "../catalogue/compositions.tsx";

Deno.test("selected purpose pages are discoverable and their supplied source reproduces the live composition", async () => {
  const output = await Deno.makeTempDir();
  try {
    const config = toFileUrl(`${output}/deno.json`);
    const projectUrl = new URL("../deno.json", import.meta.url);
    const project = JSON.parse(await Deno.readTextFile(projectUrl)) as {
      compilerOptions: Record<string, unknown>;
      imports: Record<string, string>;
    };
    const authoringPackage = JSON.parse(
      await Deno.readTextFile(
        new URL("../package.json", import.meta.url),
      ),
    ) as { devDependencies: Record<string, string> };
    await Deno.writeTextFile(
      `${output}/package.json`,
      JSON.stringify({
        type: "module",
        dependencies: Object.fromEntries(
          ["react", "react-dom", "@types/react", "@types/react-dom"].map((
            name,
          ) => [name, authoringPackage.devDependencies[name]]),
        ),
      }),
    );
    await Deno.writeTextFile(
      config,
      JSON.stringify({
        compilerOptions: project.compilerOptions,
        nodeModulesDir: "auto",
        imports: {
          ...Object.fromEntries(
            Object.entries(project.imports).map((
              [name, target],
            ) => [
              name,
              target.startsWith(".")
                ? new URL(target, projectUrl).href
                : target,
            ]),
          ),
          "@discern-sh/design-system/react":
            new URL("../src/react.ts", import.meta.url).href,
        },
      }),
    );
    const entries: string[] = [];
    for (const purpose of ["marketing", "reading", "operations"]) {
      const id = `quiet-instrument-${purpose}`;
      const recipe = compositionRecipes.find((entry) => entry.id === id);
      assert(recipe, `${purpose} needs a normal Composition entry`);
      assert(
        compositionGalleryItems(compositionRecipes).some((entry) =>
          entry.id === id
        ),
      );
      assert(
        compositionSearchRecords(compositionRecipes).some((entry) =>
          entry.id === `composition:${id}`
        ),
      );
      assert(recipe.sourceFiles, `${id} must supply every local source file`);
      const directory = `${output}/${purpose}`;
      await Deno.mkdir(directory);
      for (const file of recipe.sourceFiles) {
        await Deno.writeTextFile(`${directory}/${file.name}`, file.source);
        assert(
          !/from ["'][^"']*(?:catalogue|review|src\/react)/u.test(file.source),
          `${id}/${file.name} leaked a repository import`,
        );
      }
      assertEquals(
        recipe.sourceFiles.find(({ name }) => name === "quiet-instrument.css")
          ?.source,
        await Deno.readTextFile(
          new URL("../catalogue/compositions/signature.css", import.meta.url),
        ),
      );
      const copied = toFileUrl(`${directory}/page.tsx`).href;
      entries.push(copied);
    }
    const checked = await new Deno.Command(Deno.execPath(), {
      args: ["check", "--config", fromFileUrl(config), ...entries],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(checked.success, new TextDecoder().decode(checked.stderr));

    // Render the supplied files in their consumer import context, then compare
    // their actual output with the Catalogue recipe rather than a second template.
    const renderScript = `${output}/render.tsx`;
    await Deno.writeTextFile(
      renderScript,
      `import { createElement } from "react";\nimport { renderToStaticMarkup } from "react-dom/server";\n${
        entries.map((entry, index) =>
          `import Page${index} from ${JSON.stringify(entry)};`
        ).join("\n")
      }\nfor (const Page of [${
        entries.map((_, index) => `Page${index}`).join(", ")
      }]) {\n console.log(JSON.stringify(renderToStaticMarkup(createElement(Page))));\n}\n`,
    );
    const rendered = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--config",
        fromFileUrl(config),
        "--allow-env=NODE_ENV",
        renderScript,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(rendered.success, new TextDecoder().decode(rendered.stderr));
    const copiedMarkup = new TextDecoder().decode(rendered.stdout).trim().split(
      "\n",
    ).map((line) => JSON.parse(line) as string);
    for (
      const [index, purpose] of ["marketing", "reading", "operations"].entries()
    ) {
      const recipe = compositionRecipes.find(({ id }) =>
        id === `quiet-instrument-${purpose}`
      )!;
      assertEquals(
        copiedMarkup[index],
        renderToStaticMarkup(createElement(recipe.Example)),
        purpose,
      );
    }
  } finally {
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("complete purpose specimens fit their allocation with enlarged fallback text", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await emitDesignSystemRuntime({
      outputRoot: toFileUrl(`${output}/`),
      groups: componentGroups,
    });
    const css = await Deno.readTextFile(`${output}/discern.css`);
    const compositionCss = await Deno.readTextFile(
      new URL("../catalogue/compositions/signature.css", import.meta.url),
    );
    const page = await browser.newPage();
    for (const purpose of ["reading", "operations", "marketing"] as const) {
      const html = renderToStaticMarkup(createElement(SignatureSpecimen, {
        purpose,
        id: "specimen",
        verification: createElement(
          compositionRecipes.find(({ id }) =>
            id === "handoff-verification-report"
          )!.Example,
        ),
        treatments: {
          depth: true,
          ambient: true,
          shimmer: true,
          relief: true,
          tint: false,
          motion: false,
        },
      }));
      for (const theme of ["light", "dark"]) {
        for (const width of [390, 720, 1120]) {
          await withViewport(page, { width, height: 900 }, async () => {
            // No font asset is selected: these are the actual public fallbacks.
            await page.setContent(
              `<html data-discern-root data-discern-theme="${theme}">
            <style>${css}${compositionCss}html{font-size:24px}</style>
            <body><div class="discern-signature-specimen">${html}</div></body></html>`,
            );
            const geometry = await page.locator("html").evaluate((root) => ({
              available: root.clientWidth,
              content: root.scrollWidth,
            }));
            assertEquals(
              geometry.content,
              geometry.available,
              `${purpose}/${theme}/${width}`,
            );
            const skippedHeadings = await page.locator(
              ".discern-signature-specimen",
            ).evaluate((root) => {
              const headings = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6")];
              return headings.filter((node, index) =>
                index > 0 &&
                Number(node.tagName.slice(1)) >
                  Number(headings[index - 1]!.tagName.slice(1)) + 1
              ).map((node) => node.textContent);
            });
            assertEquals(
              skippedHeadings,
              [],
              `${purpose} must preserve a complete heading hierarchy`,
            );
          });
        }
      }
      await withViewport(page, { width: 1440, height: 900 }, async () => {
        const headings = [];
        for (const rootHeadingLevel of [1, 2] as const) {
          const example = renderToStaticMarkup(
            createElement(SignatureSpecimen, {
              purpose,
              id: "heading-parity",
              rootHeadingLevel,
              treatments: {
                depth: true,
                ambient: true,
                shimmer: true,
                relief: true,
                tint: false,
                motion: false,
              },
            }),
          );
          await page.setContent(
            `<html data-discern-root data-discern-theme="light"><style>${css}${compositionCss}</style><body><div class="discern-signature-specimen" style="width:360px">${example}</div></body></html>`,
          );
          const styles = await page.locator(".discern-signature-specimen")
            .evaluate((root) => {
              const title = root.querySelector("h1, h2")!;
              return [
                title,
                ...root.querySelectorAll(
                  ".discern-signature-benefits :is(h2,h3)",
                ),
              ].map((node) => {
                const style = getComputedStyle(node);
                return {
                  family: style.fontFamily,
                  size: style.fontSize,
                  weight: style.fontWeight,
                  leading: style.lineHeight,
                  spacing: style.letterSpacing,
                  margin: style.margin,
                };
              });
            });
          headings.push(styles);
        }
        assertEquals(
          headings[0],
          headings[1],
          `${purpose} must preserve visual heading roles when embedded below another page heading`,
        );
      });
    }
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});

Deno.test("the standalone consumer uses emitted assets and an independent marketing font role", async () => {
  const output = await Deno.makeTempDir();
  const browser = await launchBrowser();
  try {
    await buildSignatureConsumer(toFileUrl(`${output}/`));
    const page = await browser.newPage();
    await page.goto(toFileUrl(`${output}/index.html`).href);
    await page.evaluate(() => document.fonts.ready);
    assertEquals(await page.locator("script").count(), 0);
    assertEquals(
      await page.locator('link[rel="stylesheet"]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("href"))
      ),
      ["./discern.css", "./fonts.css"],
    );
    const headline = page.locator(".discern-hero-block__title");
    const loadedFaces = await page.evaluate(async () =>
      (await document.fonts.load('600 32px "Discern Inter Marketing"'))
        .map((face) => ({ family: face.family, status: face.status }))
    );
    assert(loadedFaces.length > 0, "the emitted marketing WOFF2 must load");
    assert(loadedFaces.every((face) => face.status === "loaded"));
    assert(
      (await headline.evaluate((node) => getComputedStyle(node).fontFamily))
        .includes("Discern Inter Marketing"),
    );
    const button = page.locator(".discern-button").first();
    const originalUi = await button.evaluate((node) =>
      getComputedStyle(node).fontFamily
    );
    await page.locator("html").evaluate((root) =>
      root.style.setProperty("--discern-font-marketing", "Georgia, serif")
    );
    assertEquals(
      await headline.evaluate((node) => getComputedStyle(node).fontFamily),
      "Georgia, serif",
    );
    assertEquals(
      await button.evaluate((node) => getComputedStyle(node).fontFamily),
      originalUi,
      "changing the consumer's marketing face must not rebrand UI text",
    );
  } finally {
    await browser.close();
    await Deno.remove(output, { recursive: true });
  }
});
