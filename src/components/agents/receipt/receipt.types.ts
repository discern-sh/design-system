/**
 * Framework-neutral vocabulary shared by Receipt renderers.
 *
 * @module
 */

/** Outcome shared by web and CLI Receipt check rows. */
export type ReceiptCheckState = "pass" | "fail" | "skip";

/** Optional outcome stamp shared by web and CLI Receipts. */
export type ReceiptStamp = "pass" | "fail";
