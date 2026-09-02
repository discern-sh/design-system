import type { Locator, Page } from "playwright-core";
import { BUILDER_STORAGE_KEYS } from "../../../catalogue/builder/persistence.ts";
import { placeNamedComponent } from "./discovery.ts";
import {
  ACTION_TIMEOUT,
  activatePane,
  CANVAS_PAGE,
  invariant,
  OUTLINE_ITEM,
  OUTLINE_ROW,
} from "./support.ts";

export async function findOutlineRow(
  page: Page,
  label: string,
): Promise<Locator> {
  const rows = page.locator(OUTLINE_ROW);
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    if ((await row.textContent())?.trim() === label) return row;
  }
  throw new Error(`Outline has no exact ${JSON.stringify(label)} row`);
}

export async function outlineLabels(page: Page): Promise<readonly string[]> {
  return await page.locator(OUTLINE_ROW).evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "")
  );
}

export async function selectComposition(page: Page): Promise<void> {
  const breadcrumb = page.getByRole("navigation", { name: "Selection path" });
  if (await breadcrumb.count()) {
    await breadcrumb.getByRole("button", {
      name: "Composition",
      exact: true,
    }).click({ timeout: ACTION_TIMEOUT });
  }
  await activatePane(page, "inspector");
  await page.getByRole("heading", { name: "Composition", exact: true }).waitFor(
    {
      timeout: ACTION_TIMEOUT,
    },
  );
}

export async function documentWitness(page: Page): Promise<string> {
  const history = page.getByRole("group", { name: "History" });
  return JSON.stringify({
    acceptedDocument: await page.evaluate(
      (key) => localStorage.getItem(key),
      BUILDER_STORAGE_KEYS.document,
    ),
    name: await page.getByRole("textbox", { name: "Composition name" })
      .inputValue(),
    outline: await page.locator(OUTLINE_ROW).evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.closest("[data-discern-builder-outline-id]")?.getAttribute(
          "data-discern-builder-outline-id",
        ),
        text: node.textContent?.trim() ?? "",
      }))
    ),
    canvas: await page.locator(CANVAS_PAGE).innerText(),
    selection: await page.locator(`${OUTLINE_ITEM} [aria-current="true"]`)
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.closest("[data-discern-builder-outline-id]")?.getAttribute(
            "data-discern-builder-outline-id",
          ) ?? ""
        )
      ),
    undoDisabled: await history.getByRole("button", { name: /Undo/ })
      .isDisabled(),
    redoDisabled: await history.getByRole("button", { name: /Redo/ })
      .isDisabled(),
  });
}

export async function assertInteractiveShortcutIsolation(
  page: Page,
  target: Locator,
  label: string,
): Promise<number> {
  invariant(await target.isVisible(), `${label} shortcut witness is hidden`);
  await page.evaluate(() =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )
  );
  const before = await documentWitness(page);
  await target.focus();
  invariant(
    await target.evaluate((node) => document.activeElement === node),
    `${label} shortcut witness did not take focus`,
  );
  await target.press("Delete");
  invariant(
    await documentWitness(page) === before,
    `${label} Delete shortcut changed the document`,
  );
  await target.press("Control+z");
  invariant(
    await documentWitness(page) === before,
    `${label} undo shortcut changed the document`,
  );
  return 2;
}

export async function verifyShortcutIsolation(page: Page): Promise<number> {
  let checks = 0;
  await activatePane(page, "inspector");
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.locator(".discern-builder-brand"),
    "focused link",
  );
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByRole("button", { name: "Duplicate", exact: true }),
    "focused action button",
  );
  checks += await verifyLayerDocumentShortcuts(page);

  await activatePane(page, "palette");
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByRole("searchbox", { name: "Search components" }),
    "focused search field",
  );

  await selectComposition(page);
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.getByLabel("Import builder JSON", { exact: true }),
    "focused file control",
  );
  checks += await assertInteractiveShortcutIsolation(
    page,
    page.locator(".discern-builder-cost-detail > summary"),
    "focused disclosure",
  );
  checks += await verifyStructuralAuthoring(page);
  return checks;
}

async function verifyLayerDocumentShortcuts(page: Page): Promise<number> {
  const row = await findOutlineRow(page, "Button");
  await row.click();
  const item = row.locator(
    "xpath=ancestor::*[@data-discern-builder-outline-id][1]",
  );
  const id = await item.getAttribute("data-discern-builder-outline-id");
  invariant(id !== null, "focused Button layer has no stable id");
  await row.press("Delete");
  await page.locator(`[data-discern-builder-outline-id="${id}"]`).waitFor({
    state: "detached",
    timeout: ACTION_TIMEOUT,
  });
  const survivor = page.locator(
    ".discern-builder-layers__select[aria-current='true']",
  );
  const survivorId = await survivor.evaluate((element) =>
    element.closest("[data-discern-builder-outline-id]")?.getAttribute(
      "data-discern-builder-outline-id",
    )
  );
  invariant(
    survivorId !== null && survivorId !== undefined &&
      await survivor.evaluate((element) =>
        element.ownerDocument.activeElement === element
      ),
    "Layers delete did not focus the nearest surviving selection",
  );
  await page.keyboard.press("Control+z");
  const restored = page.locator(
    `[data-discern-builder-outline-id="${id}"]`,
  );
  await restored.waitFor({ state: "visible", timeout: ACTION_TIMEOUT });
  const selectedAfterUndo = page.locator(
    `[data-discern-builder-outline-id="${survivorId}"] .discern-builder-layers__select`,
  );
  invariant(
    await selectedAfterUndo.evaluate((element) =>
      element.ownerDocument.activeElement === element &&
      element.getAttribute("aria-current") === "true"
    ),
    "Layers undo did not preserve the reconciled selection and focus",
  );
  await page.keyboard.press("Control+Shift+z");
  await page.locator(`[data-discern-builder-outline-id="${id}"]`).waitFor({
    state: "detached",
    timeout: ACTION_TIMEOUT,
  });
  await page.keyboard.press("Control+z");
  await restored.waitFor({ state: "visible", timeout: ACTION_TIMEOUT });
  return 4;
}

async function layerItem(page: Page, label: string): Promise<Locator> {
  const row = await findOutlineRow(page, label);
  const id = await row.evaluate((node) =>
    node.closest("[data-discern-builder-outline-id]")?.getAttribute(
      "data-discern-builder-outline-id",
    )
  );
  invariant(id !== null && id !== undefined, `${label} row has no layer id`);
  return page.locator(`[data-discern-builder-outline-id="${id}"]`);
}

/** Guard explicit placement, structural Layers, and zoomed canvas actions. */
async function verifyStructuralAuthoring(page: Page): Promise<number> {
  let checks = 0;
  const warnings: string[] = [];
  const onConsole = (message: { type(): string; text(): string }): void => {
    if (
      message.type() === "error" &&
      /validateDOMNesting|cannot appear as a descendant/i.test(message.text())
    ) warnings.push(message.text());
  };
  page.on("console", onConsole);
  try {
    await (await findOutlineRow(page, "Button")).click();
    await placeNamedComponent(page, "Stack");
    const roots = await page.locator(`${OUTLINE_ITEM}[aria-level="1"]`)
      .evaluateAll(
        (nodes, rowSelector) =>
          nodes.map((node) =>
            node.querySelector(rowSelector)?.textContent?.trim() ?? ""
          ),
        OUTLINE_ROW,
      );
    invariant(
      roots.at(-1) === "Stack",
      `generic Add followed selection instead of the page cursor: ${
        roots.join(", ")
      }`,
    );
    checks += 1;

    const stack = await layerItem(page, "Stack");
    await stack.getByRole("button", { name: "Content", exact: true }).click();
    invariant(
      (await page.locator(".discern-builder-layers__cursor").innerText())
        .includes("Stack › Content"),
      "armed Stack target did not name its exact slot",
    );
    await page.getByRole("searchbox", { name: "Search components" }).press(
      "Escape",
    );
    invariant(
      await page.locator(".discern-builder-layers__cursor").count() === 0 &&
        await stack.getAttribute("aria-selected") === "true",
      "Escape did not cancel the target before clearing selection",
    );
    checks += 2;

    await stack.getByRole("button", { name: "Content", exact: true }).click();
    await placeNamedComponent(page, "Button");
    const nestedRows = page.locator(`${OUTLINE_ITEM}[aria-level="2"]`);
    invariant(await nestedRows.count() > 0, "Stack did not receive a Button");
    const nestedButton = nestedRows.last();
    const nestedId = await nestedButton.getAttribute(
      "data-discern-builder-outline-id",
    );
    invariant(nestedId !== null, "nested Button has no stable tree id");
    const siblingId = await nestedRows.nth(await nestedRows.count() - 2)
      .getAttribute("data-discern-builder-outline-id");
    invariant(siblingId !== null, "nested Button has no stable sibling id");
    await nestedButton.getByRole("button", { name: "Content", exact: true })
      .click();
    const refusedBefore = await documentWitness(page);
    await page.getByRole("button", { name: "Place Button", exact: true })
      .click();
    invariant(
      await documentWitness(page) === refusedBefore,
      "refused nested Button changed document, history, or selection",
    );
    const refusal = await page.locator(".discern-builder-layers__refusal")
      .innerText();
    invariant(
      refusal.includes(
        "interactive controls cannot contain interactive controls",
      ) &&
        refusal.includes("End of composition"),
      `nested Button refusal lacked cause or valid alternative: ${refusal}`,
    );
    checks += 2;

    const paletteSearch = page.getByRole("searchbox", {
      name: "Search components",
    });
    await paletteSearch.press("Escape");
    await page.locator(".discern-builder-purpose select").selectOption("");
    await paletteSearch.fill("Button");
    const draggedBefore = await documentWitness(page);
    await page.getByRole("button", { name: "Place Button", exact: true })
      .dragTo(
        nestedButton.getByRole("button", { name: "Content", exact: true }),
        { timeout: ACTION_TIMEOUT },
      );
    const dragRefusal = await page.locator(
      ".discern-builder-layers__refusal",
    ).innerText();
    invariant(
      await documentWitness(page) === draggedBefore,
      "refused palette drag changed document, history, or selection",
    );
    invariant(
      dragRefusal.includes(
        "interactive controls cannot contain interactive controls",
      ) && dragRefusal.includes("End of composition"),
      `nested Button drag refusal lacked cause or valid alternative: ${dragRefusal}`,
    );
    checks += 2;

    await page.locator("#discern-builder-pane-inspector").getByText(
      "Behaviour",
      { exact: true },
    ).click();
    await page.getByRole("textbox", { name: "Href optional", exact: true })
      .fill("/valid-sibling");
    await page.locator(".discern-builder-layers__refusal").waitFor({
      state: "detached",
      timeout: ACTION_TIMEOUT,
    });
    invariant(
      await page.locator(".discern-builder-layers__refusal").count() === 0,
      "a valid linked-Button edit left stale placement refusal feedback",
    );
    checks += 1;

    await page.getByRole("searchbox", { name: "Search components" }).press(
      "Escape",
    );
    await page.locator(
      `[data-discern-builder-outline-id="${nestedId}"] .discern-builder-layers__select`,
    ).press("Alt+ArrowUp");
    const keyboardOrder = await page.locator(OUTLINE_ITEM).evaluateAll(
      (nodes) =>
        nodes.map((node) =>
          node.getAttribute("data-discern-builder-outline-id") ?? ""
        ),
    );
    const nestedAfterKeyboard = page.locator(
      `[data-discern-builder-outline-id="${nestedId}"]`,
    );
    await nestedAfterKeyboard.getByLabel("Actions for Button").click();
    await nestedAfterKeyboard.getByRole("button", { name: "Move after" })
      .click();
    const pointerOrder = await page.locator(OUTLINE_ITEM).evaluateAll(
      (nodes) =>
        nodes.map((node) =>
          node.getAttribute("data-discern-builder-outline-id") ?? ""
        ),
    );
    invariant(
      keyboardOrder.indexOf(nestedId) < keyboardOrder.indexOf(siblingId) &&
        pointerOrder.indexOf(nestedId) > pointerOrder.indexOf(siblingId),
      `keyboard and pointer reorder did not move ${nestedId} around ${siblingId}`,
    );
    checks += 1;

    await stack.getByRole("button", { name: "Collapse Stack" }).click();
    invariant(
      await page.locator(
            `[data-discern-builder-outline-id="${nestedId}"]`,
          ).count() === 0 &&
        await stack.getAttribute("aria-selected") === "true",
      "Collapse kept deep descendants visible or stranded selection inside them",
    );
    await stack.getByRole("button", { name: "Expand Stack" }).click();
    invariant(
      await page.locator(
        `[data-discern-builder-outline-id="${nestedId}"]`,
      ).count() === 1,
      "Expand did not restore deep Stack descendants",
    );
    checks += 2;

    await page.locator(
      `[data-discern-builder-outline-id="${nestedId}"] .discern-builder-layers__select`,
    ).click();
    await page.getByLabel("Add inside Button", { exact: true }).click();
    await page.getByRole("button", { name: "Add inside Content", exact: true })
      .click();
    invariant(
      await page.locator(".discern-builder-canvas-actions details[open]")
        .count() === 0,
      "canvas Add-inside menu stayed open after arming its slot",
    );
    await page.getByRole("searchbox", { name: "Search components" }).press(
      "Escape",
    );
    checks += 1;
    const scrollWitness = await page.evaluate(() => {
      const inspector = document.querySelector<HTMLElement>(
        ".discern-builder-inspector__body",
      );
      const layers = document.querySelector<HTMLElement>(
        ".discern-builder-layers__scroll",
      );
      if (inspector === null || layers === null) return null;
      inspector.scrollTop = inspector.scrollHeight;
      layers.scrollTop = layers.scrollHeight;
      return {
        distinct: inspector !== layers,
        inspectorScrollable: inspector.scrollHeight > inspector.clientHeight &&
          getComputedStyle(inspector).overflowY === "auto",
        layersScrollable: layers.scrollHeight > layers.clientHeight &&
          getComputedStyle(layers).overflowY === "auto",
        headingVisible: document.getElementById(
          "discern-builder-layers-heading",
        )?.getBoundingClientRect().height !== 0,
      };
    });
    invariant(
      scrollWitness?.distinct === true &&
        scrollWitness.inspectorScrollable && scrollWitness.layersScrollable &&
        scrollWitness.headingVisible,
      `Layers and inspector did not remain independently reachable: ${
        JSON.stringify(scrollWitness)
      }`,
    );
    checks += 1;

    await page.getByRole("button", { name: "50% preview" }).click();
    const preview = page.frameLocator(
      "iframe[data-discern-builder-preview-frame]",
    );
    const editLayer = page.locator(".discern-builder-edit-layer");
    await editLayer.hover();
    const outerScrollBefore = await page.locator(".discern-builder-canvas")
      .evaluate((element) => element.scrollTop);
    await page.mouse.wheel(0, 10_000);
    await page.waitForFunction(() =>
      document.querySelector<HTMLIFrameElement>(
        "iframe[data-discern-builder-preview-frame]",
      )?.contentWindow?.scrollY !== 0
    );
    invariant(
      await page.locator(".discern-builder-canvas").evaluate((element) =>
        element.scrollTop
      ) === outerScrollBefore,
      "edit-mode frame scrolling also moved the outer canvas",
    );
    const buttonRect = await preview.locator(".discern-button").last()
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    const target = {
      x: (buttonRect.x + buttonRect.width / 2) * 0.5,
      y: (buttonRect.y + buttonRect.height / 2) * 0.5,
    };
    const frameBox = await page.locator(
      "iframe[data-discern-builder-preview-frame]",
    ).boundingBox();
    invariant(frameBox !== null, "zoomed preview frame has no visible box");
    const clientPoint = {
      x: frameBox.x + target.x,
      y: frameBox.y + target.y,
    };
    const editLayerReceivesPoint = await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest(
          ".discern-builder-edit-layer",
        ) !== null,
      clientPoint,
    );
    invariant(
      editLayerReceivesPoint,
      `zoomed target was outside the scrolled edit layer: ${
        JSON.stringify({
          clientPoint,
          frameBox,
        })
      }`,
    );
    await page.mouse.dblclick(clientPoint.x, clientPoint.y);
    const directEditWitness = {
      textHeading: await page.getByRole("heading", {
        name: "Text",
        exact: true,
      }).count(),
      canvasActions: await page.locator(
        ".discern-builder-canvas-actions",
      ).count(),
    };
    invariant(
      directEditWitness.textHeading === 1 &&
        directEditWitness.canvasActions === 0,
      `zoomed double-click did not route literal text to its direct editor: ${
        JSON.stringify(directEditWitness)
      }`,
    );
    checks += 1;

    await page.getByRole("button", { name: "Interact", exact: true }).click();
    invariant(
      await page.locator(".discern-builder-edit-layer").count() === 0 &&
        await page.locator(".discern-builder-canvas-actions").count() === 0,
      "Interact mode retained tree-owned canvas authoring chrome",
    );
    invariant(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      ),
      "structural authoring introduced document-level overflow",
    );
    invariant(
      warnings.length === 0,
      `structural authoring emitted React nesting warnings: ${
        warnings.join("; ")
      }`,
    );
    checks += 3;
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  } finally {
    page.off("console", onConsole);
  }
  return checks;
}
