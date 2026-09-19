/** Small helpers shared by the design-system-artifact generator modules. */

/** Write text to a file URL, creating parent directories as needed. */
export async function writeText(url: URL, text: string): Promise<void> {
  await Deno.mkdir(new URL("./", url), { recursive: true });
  await Deno.writeTextFile(url, text);
}

/** Copy one file into place, creating parent directories as needed. */
export async function copyFile(from: URL, to: URL): Promise<void> {
  await Deno.mkdir(new URL("./", to), { recursive: true });
  await Deno.copyFile(from, to);
}

/** `icon-button` → `IconButton`, the artifact's component folder name. */
export function pascalCase(slug: string): string {
  return slug.split("-").map((part) =>
    `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`
  ).join("");
}

/** Escape text for an HTML text node or attribute value. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Read a value that the source guarantees to exist. */
export function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new TypeError(`Missing ${what}`);
  return value;
}
