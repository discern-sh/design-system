import type { Page } from "playwright-core";
import type {
  FontMetricCssomFace,
  FontMetricCssomSnapshot,
} from "./font-metric-overrides.ts";

/** Read the browser's effective font-face population from a CSS source. */
export async function fontMetricCssomSnapshot(
  page: Page,
  css: string,
): Promise<FontMetricCssomSnapshot> {
  return await page.evaluate((source): FontMetricCssomSnapshot => {
    const sheet = new CSSStyleSheet();
    const failures: string[] = [];
    try {
      sheet.replaceSync(source);
    } catch (error) {
      failures.push(
        `browser CSSOM could not parse font source: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const faces: FontMetricCssomFace[] = [];
    const visit = (
      rules: CSSRuleList,
      context: readonly string[],
    ): void => {
      for (const rule of Array.from(rules)) {
        const constructorName = rule.constructor.name;
        if (constructorName === "CSSFontFaceRule") {
          const style = (rule as CSSFontFaceRule).style;
          faces.push({
            context,
            descriptors: {
              ascentOverride: style.getPropertyValue("ascent-override"),
              descentOverride: style.getPropertyValue("descent-override"),
              family: style.getPropertyValue("font-family"),
              lineGapOverride: style.getPropertyValue("line-gap-override"),
              sizeAdjust: style.getPropertyValue("size-adjust"),
              source: style.getPropertyValue("src"),
              style: style.getPropertyValue("font-style"),
              weight: style.getPropertyValue("font-weight"),
            },
          });
          continue;
        }
        if (!("cssRules" in rule)) continue;
        const nested = (rule as CSSRule & { readonly cssRules: CSSRuleList })
          .cssRules;
        visit(nested, [...context, constructorName]);
      }
    };
    visit(sheet.cssRules, []);
    return { faces, failures };
  }, css);
}
