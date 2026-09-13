/**
 * Framework-neutral vocabulary shared by Verification report renderers.
 *
 * @module
 */

/** Outcome shared by web and CLI Verification report check rows. */
export type VerificationReportCheckState = "pass" | "fail" | "skip";

/** Optional outcome stamp shared by web and CLI Verification reports. */
export type VerificationReportStamp = "pass" | "fail";

/** Describe the complete check population without deriving a report verdict. */
export function verificationExtent(
  checks: readonly { readonly state: VerificationReportCheckState }[],
): string {
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const check of checks) counts[check.state]++;
  return `${checks.length} checks · ${counts.pass} passed · ${counts.fail} failed · ${counts.skip} skipped`;
}
