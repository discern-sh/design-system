/**
 * Framework-neutral vocabulary shared by Verification report renderers.
 *
 * @module
 */

/** Outcome shared by web and CLI Verification report check rows. */
export type VerificationReportCheckState = "pass" | "fail" | "skip";

/** Optional outcome stamp shared by web and CLI Verification reports. */
export type VerificationReportStamp = "pass" | "fail";
