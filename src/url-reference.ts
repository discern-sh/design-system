/** Shared safe URL-reference inspection for neutral and terminal surfaces. */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "file:"]);
const FORMAT_OR_CONTROL = /[\p{Cc}\p{Cf}]/u;
const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):/iu;
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu;
const PERCENT_ESCAPE = /%([0-9a-f]{2})/giu;
const URI_UNRESERVED = /^[A-Za-z0-9._~-]$/u;

/** Stable reason why a URL reference cannot cross a package boundary. */
export type SafeUrlReferenceFailure =
  | "not-string"
  | "empty-or-non-ascii"
  | "backslash"
  | "encoded-control"
  | "unsafe-scheme"
  | "invalid-url";

/** Result shared by semantic inline content and Markdown resources. */
export type SafeUrlReferenceInspection =
  | { readonly ok: true; readonly value: string }
  | {
    readonly ok: false;
    readonly reason: SafeUrlReferenceFailure;
    readonly scheme?: string;
  };

/** Inspect an already-ASCII reference without rewriting consumer bytes. */
export function inspectSafeAsciiUrlReference(
  value: unknown,
): SafeUrlReferenceInspection {
  if (typeof value !== "string") return { ok: false, reason: "not-string" };
  if (value === "" || !/^[!-~]+$/u.test(value)) {
    return { ok: false, reason: "empty-or-non-ascii" };
  }
  if (value.includes("\\")) return { ok: false, reason: "backslash" };
  if (ENCODED_CONTROL.test(value)) {
    return { ok: false, reason: "encoded-control" };
  }
  const scheme = EXPLICIT_SCHEME.exec(value)?.[1]?.toLowerCase();
  if (scheme !== undefined && !SAFE_PROTOCOLS.has(`${scheme}:`)) {
    return { ok: false, reason: "unsafe-scheme", scheme };
  }
  try {
    new URL(value, "https://url-reference.invalid/");
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  return { ok: true, value };
}

/** Encode Unicode before applying the shared safe-reference policy. */
export function safeAsciiUrlReference(value: string): string | undefined {
  if (value === "" || FORMAT_OR_CONTROL.test(value)) return undefined;
  let encoded: string;
  try {
    encoded = [...value].map((character) =>
      (character.codePointAt(0) ?? 0) <= 0x7f
        ? character
        : encodeURIComponent(character)
    ).join("");
  } catch {
    return undefined;
  }
  const inspected = inspectSafeAsciiUrlReference(encoded);
  return inspected.ok ? inspected.value : undefined;
}

/** Canonical package identity for a safe Markdown image source. */
export function canonicalSafeUrlReference(value: string): string | undefined {
  const safe = safeAsciiUrlReference(value);
  if (safe === undefined) return undefined;
  return safe
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E")
    .replace(PERCENT_ESCAPE, (_escape, hexadecimal: string) => {
      const character = String.fromCharCode(Number.parseInt(hexadecimal, 16));
      return URI_UNRESERVED.test(character)
        ? character
        : `%${hexadecimal.toUpperCase()}`;
    });
}
