/** One decoded CSS declaration from a declaration block. */
export interface CssDeclaration {
  readonly name: string;
  readonly value: string;
}

/** A CSS source with comments replaced outside strings. */
export interface StrippedCss {
  readonly css: string;
  readonly failures: readonly string[];
}

export function cssEscapeEnd(value: string, start: number): number {
  let position = start + 1;
  if (position >= value.length) return position;
  if (/[0-9a-f]/i.test(value[position] ?? "")) {
    let digits = 0;
    while (
      position < value.length && digits < 6 &&
      /[0-9a-f]/i.test(value[position] ?? "")
    ) {
      position += 1;
      digits += 1;
    }
    if (/\s/.test(value[position] ?? "")) position += 1;
    return position;
  }
  if (value[position] === "\r" && value[position + 1] === "\n") {
    return position + 2;
  }
  return position + 1;
}

export function decodeCssEscapes(value: string): string {
  let decoded = "";
  let position = 0;
  while (position < value.length) {
    if (value[position] !== "\\") {
      decoded += value[position] ?? "";
      position += 1;
      continue;
    }
    const end = cssEscapeEnd(value, position);
    const escaped = value.slice(position + 1, end);
    const hexadecimal = escaped.match(/^([0-9a-f]{1,6})/i)?.[1];
    if (hexadecimal !== undefined) {
      const codePoint = Number.parseInt(hexadecimal, 16);
      decoded += codePoint === 0 || codePoint > 0x10ffff
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    } else if (!/^[\r\n\f]/.test(escaped)) {
      decoded += escaped[0] ?? "";
    }
    position = end;
  }
  return decoded;
}

export function cssIdentifier(
  value: string,
  start: number,
): { readonly end: number; readonly value: string } | undefined {
  const first = value[start] ?? "";
  if (
    !/[-_a-z]/i.test(first) &&
    first !== "\\" &&
    (first.codePointAt(0) ?? 0) < 0x80
  ) {
    return undefined;
  }
  let position = start;
  while (position < value.length) {
    const character = value[position] ?? "";
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (
      /[-_a-z0-9]/i.test(character) ||
      (character.codePointAt(0) ?? 0) >= 0x80
    ) {
      position += 1;
      continue;
    }
    break;
  }
  return {
    end: position,
    value: decodeCssEscapes(value.slice(start, position)),
  };
}

export function skipCssString(value: string, start: number): number {
  const quote = value[start];
  let position = start + 1;
  while (position < value.length) {
    const character = value[position];
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
    } else {
      position += 1;
      if (character === quote) break;
    }
  }
  return position;
}

export function stripCssComments(value: string): StrippedCss {
  const chunks: string[] = [];
  const failures: string[] = [];
  let position = 0;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      const end = skipCssString(value, position);
      chunks.push(value.slice(position, end));
      position = end;
      continue;
    }
    if (character === "\\") {
      const end = cssEscapeEnd(value, position);
      chunks.push(value.slice(position, end));
      position = end;
      continue;
    }
    if (character === "/" && value[position + 1] === "*") {
      const commentEnd = value.indexOf("*/", position + 2);
      if (commentEnd < 0) {
        chunks.push(" ".repeat(value.length - position));
        failures.push("CSS has an unterminated comment");
        break;
      }
      const end = commentEnd + 2;
      chunks.push(" ".repeat(end - position));
      position = end;
      continue;
    }
    chunks.push(character ?? "");
    position += 1;
  }
  return { css: chunks.join(""), failures };
}

export function matchingCssBlockEnd(
  value: string,
  start: number,
): number | undefined {
  let depth = 1;
  let position = start + 1;
  while (position < value.length) {
    const character = value[position];
    if (character === "'" || character === '"') {
      position = skipCssString(value, position);
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(value, position);
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return position;
    }
    position += 1;
  }
  return undefined;
}

export function cssAtRuleBlocks(
  source: string,
  atRuleName: string,
): {
  readonly blocks: readonly string[];
  readonly failures: readonly string[];
} {
  const stripped = stripCssComments(source);
  const blocks: string[] = [];
  const failures = [...stripped.failures];
  let position = 0;
  while (position < stripped.css.length) {
    const character = stripped.css[position];
    if (character === "'" || character === '"') {
      position = skipCssString(stripped.css, position);
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(stripped.css, position);
      continue;
    }
    if (character !== "@") {
      position += 1;
      continue;
    }
    const name = cssIdentifier(stripped.css, position + 1);
    if (name === undefined) {
      position += 1;
      continue;
    }
    position = name.end;
    if (name.value.toLowerCase() !== atRuleName.toLowerCase()) continue;
    while (/\s/.test(stripped.css[position] ?? "")) position += 1;
    if (stripped.css[position] !== "{") continue;
    const end = matchingCssBlockEnd(stripped.css, position);
    if (end === undefined) {
      failures.push(`@${atRuleName} has an unterminated declaration block`);
      break;
    }
    blocks.push(stripped.css.slice(position + 1, end));
    position = end + 1;
  }
  return { blocks, failures };
}

export function cssDeclarations(block: string): CssDeclaration[] {
  const declarations: CssDeclaration[] = [];
  let position = 0;
  while (position < block.length) {
    while (
      position < block.length &&
      (/\s/.test(block[position] ?? "") || block[position] === ";")
    ) {
      position += 1;
    }
    const property = cssIdentifier(block, position);
    if (property === undefined) {
      position += 1;
      continue;
    }
    position = property.end;
    while (/\s/.test(block[position] ?? "")) position += 1;
    if (block[position] !== ":") {
      while (position < block.length && block[position] !== ";") position += 1;
      continue;
    }
    position += 1;
    const valueStart = position;
    let roundDepth = 0;
    let squareDepth = 0;
    let curlyDepth = 0;
    while (position < block.length) {
      const character = block[position];
      if (character === "'" || character === '"') {
        position = skipCssString(block, position);
        continue;
      }
      if (character === "\\") {
        position = cssEscapeEnd(block, position);
        continue;
      }
      if (character === "(") roundDepth += 1;
      else if (character === ")") roundDepth = Math.max(0, roundDepth - 1);
      else if (character === "[") squareDepth += 1;
      else if (character === "]") squareDepth = Math.max(0, squareDepth - 1);
      else if (character === "{") curlyDepth += 1;
      else if (character === "}") curlyDepth = Math.max(0, curlyDepth - 1);
      else if (
        character === ";" &&
        roundDepth === 0 &&
        squareDepth === 0 &&
        curlyDepth === 0
      ) {
        break;
      }
      position += 1;
    }
    declarations.push({
      name: property.value.toLowerCase(),
      value: block.slice(valueStart, position).trim(),
    });
    if (block[position] === ";") position += 1;
  }
  return declarations;
}

export function cssIdentifiers(source: string): readonly string[] {
  const stripped = stripCssComments(source).css;
  const identifiers: string[] = [];
  let position = 0;
  while (position < stripped.length) {
    const character = stripped[position];
    if (character === "'" || character === '"') {
      position = skipCssString(stripped, position);
      continue;
    }
    const identifier = cssIdentifier(stripped, position);
    if (identifier === undefined) {
      position += 1;
      continue;
    }
    identifiers.push(identifier.value);
    position = identifier.end;
  }
  return identifiers;
}

/**
 * Decoded identifier-shaped words from every non-comment part of a CSS
 * source, including strings and at-rule preludes.
 */
export function cssDecodedIdentifiers(source: string): readonly string[] {
  const decoded = decodeCssEscapes(stripCssComments(source).css);
  const identifiers: string[] = [];
  let position = 0;
  while (position < decoded.length) {
    const identifier = cssIdentifier(decoded, position);
    if (identifier === undefined) {
      position += 1;
      continue;
    }
    identifiers.push(identifier.value);
    position = identifier.end;
  }
  return identifiers;
}

function ruleBoundary(
  source: string,
  start: number,
  end: number,
):
  | { readonly character: ";" | "{" | "}"; readonly position: number }
  | undefined {
  let position = start;
  let roundDepth = 0;
  let squareDepth = 0;
  while (position < end) {
    const character = source[position];
    if (character === "'" || character === '"') {
      position = skipCssString(source, position);
      continue;
    }
    if (character === "\\") {
      position = cssEscapeEnd(source, position);
      continue;
    }
    if (character === "(") roundDepth += 1;
    else if (character === ")") roundDepth = Math.max(0, roundDepth - 1);
    else if (character === "[") squareDepth += 1;
    else if (character === "]") squareDepth = Math.max(0, squareDepth - 1);
    else if (
      (character === ";" || character === "{" || character === "}") &&
      roundDepth === 0 &&
      squareDepth === 0
    ) {
      return {
        character,
        position,
      };
    }
    position += 1;
  }
  return undefined;
}

interface CssRulePrelude {
  readonly kind: "at-rule" | "qualified-rule";
  readonly value: string;
}

function cssRulePreludes(source: string): readonly CssRulePrelude[] {
  const stripped = stripCssComments(source).css;
  const preludes: CssRulePrelude[] = [];
  const walk = (start: number, end: number): void => {
    let position = start;
    while (position < end) {
      while (/\s/.test(stripped[position] ?? "")) position += 1;
      const boundary = ruleBoundary(stripped, position, end);
      if (boundary === undefined || boundary.character === "}") return;
      if (boundary.character === ";") {
        position = boundary.position + 1;
        continue;
      }
      const value = stripped.slice(position, boundary.position).trim();
      const blockEnd = matchingCssBlockEnd(stripped, boundary.position);
      if (blockEnd === undefined || blockEnd > end) return;
      if (value !== "") {
        preludes.push({
          kind: value.startsWith("@") ? "at-rule" : "qualified-rule",
          value,
        });
      }
      walk(boundary.position + 1, blockEnd);
      position = blockEnd + 1;
    }
  };
  walk(0, stripped.length);
  return preludes;
}

/** Qualified-rule selector preludes, including rules nested in at-rules. */
export function cssQualifiedRuleSelectors(
  source: string,
): readonly string[] {
  return cssRulePreludes(source).flatMap(({ kind, value }) =>
    kind === "qualified-rule" ? [value] : []
  );
}

/** Decoded class-selector identifiers from one selector prelude. */
export function cssSelectorClassNames(
  selector: string,
): readonly string[] {
  const classes: string[] = [];
  let position = 0;
  while (position < selector.length) {
    const character = selector[position];
    if (character === "'" || character === '"') {
      position = skipCssString(selector, position);
      continue;
    }
    if (character !== ".") {
      position += 1;
      continue;
    }
    const identifier = cssIdentifier(selector, position + 1);
    if (identifier === undefined) {
      position += 1;
      continue;
    }
    classes.push(identifier.value);
    position = identifier.end;
  }
  return classes;
}

/** Decoded class-selector names from qualified rules and at-rule preludes. */
export function cssClassNames(source: string): readonly string[] {
  return [
    ...new Set(
      cssRulePreludes(source).flatMap(({ value }) =>
        cssSelectorClassNames(value)
      ),
    ),
  ].toSorted();
}
