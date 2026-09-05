import type { Page } from "playwright-core";

/** Find single text rows that overflow a centered grid toward its block end. */
export async function misalignedGridText(page: Page): Promise<string[]> {
  return await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("*")].flatMap((node) => {
      const style = getComputedStyle(node);
      if (
        !style.display.includes("grid") || style.alignItems !== "center" ||
        node.childElementCount > 1 || !node.textContent?.trim() ||
        node.firstElementChild instanceof SVGElement ||
        node.firstElementChild instanceof HTMLImageElement ||
        node.getClientRects().length === 0 ||
        !/^[\d.]+px$/u.test(style.gridTemplateRows)
      ) return [];
      const block = style.writingMode.startsWith("vertical")
        ? [
          style.paddingRight,
          style.paddingLeft,
          style.borderRightWidth,
          style.borderLeftWidth,
        ]
        : [
          style.paddingTop,
          style.paddingBottom,
          style.borderTopWidth,
          style.borderBottomWidth,
        ];
      const contentSize = parseFloat(style.blockSize) -
        (style.boxSizing === "border-box"
          ? block.reduce((sum, value) => sum + parseFloat(value), 0)
          : 0);
      const rowSize = parseFloat(style.gridTemplateRows);
      return rowSize > contentSize + 0.5 &&
          style.alignContent !== "center" &&
          style.alignContent !== "unsafe center"
        ? [
          `${
            node.className || node.tagName
          }: ${rowSize}px text row in ${contentSize}px box (${style.alignContent})`,
        ]
        : [];
    })
  );
}
