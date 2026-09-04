/**
 * Complete public Token inventory. Projection graphs import their narrower
 * authorities; manifests and discovery surfaces import this complete
 * inventory.
 *
 * @module
 */

import { accentHueToken, allTokens } from "./tokens/tokens.ts";
import type { DesignToken, ThemeToken } from "./tokens/tokens.ts";

/** Every public Token exposed by the package, including the accent hue primitive. */
export const publicTokens: readonly (DesignToken | ThemeToken)[] = Object
  .freeze([...allTokens, accentHueToken]);
