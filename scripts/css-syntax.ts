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

/** The grammar context that directly contains a parsed CSS rule. */
export type CssRuleParent = "stylesheet" | "at-rule" | "qualified-rule";

/** One parsed block at-rule with its grammar context. */
export interface CssAtRuleBlock {
  readonly block: string;
  readonly depth: number;
  readonly parent: CssRuleParent;
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
  readonly blocks: readonly CssAtRuleBlock[];
  readonly failures: readonly string[];
} {
  const parsed = parsedCssRules(source);
  const blocks: CssAtRuleBlock[] = [];
  const failures = [...parsed.failures];
  for (const rule of parsed.rules) {
    if (rule.kind !== "at-rule") continue;
    const atRule = cssAtRulePrelude(rule.prelude);
    if (
      atRule === undefined ||
      atRule.name.toLowerCase() !== atRuleName.toLowerCase()
    ) {
      continue;
    }
    if (atRule.remainder !== "") {
      failures.push(`@${atRuleName} has an invalid prelude`);
      continue;
    }
    blocks.push({
      block: rule.block,
      depth: rule.depth,
      parent: rule.parent,
    });
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

/** Decoded at-rule names outside comments and strings. */
export function cssAtRuleNames(source: string): readonly string[] {
  const stripped = stripCssComments(source).css;
  const names: string[] = [];
  let position = 0;
  while (position < stripped.length) {
    const character = stripped[position];
    if (character === "'" || character === '"') {
      position = skipCssString(stripped, position);
      continue;
    }
    if (character !== "@") {
      position += 1;
      continue;
    }
    const identifier = cssIdentifier(stripped, position + 1);
    if (identifier === undefined) {
      position += 1;
      continue;
    }
    names.push(identifier.value);
    position = identifier.end;
  }
  return names;
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

interface ParsedCssRule {
  readonly block: string;
  readonly depth: number;
  readonly kind: CssRulePrelude["kind"];
  readonly parent: CssRuleParent;
  readonly prelude: string;
}

interface ParsedCssRules {
  readonly failures: readonly string[];
  readonly rules: readonly ParsedCssRule[];
}

/** One qualified CSS rule and its declaration block. */
export interface CssQualifiedRuleBlock {
  readonly block: string;
  readonly depth: number;
  readonly parent: CssRuleParent;
  readonly selector: string;
}

function cssAtRulePrelude(
  prelude: string,
): { readonly name: string; readonly remainder: string } | undefined {
  if (!prelude.startsWith("@")) return undefined;
  const name = cssIdentifier(prelude, 1);
  if (name === undefined) return undefined;
  return {
    name: name.value,
    remainder: prelude.slice(name.end).trim(),
  };
}

function parsedCssRules(source: string): ParsedCssRules {
  const strippedSource = stripCssComments(source);
  const stripped = strippedSource.css;
  const failures = [...strippedSource.failures];
  const rules: ParsedCssRule[] = [];
  const walk = (
    start: number,
    end: number,
    parent: CssRuleParent,
    depth: number,
  ): void => {
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
      if (blockEnd === undefined || blockEnd > end) {
        failures.push("CSS has an unterminated rule block");
        return;
      }
      if (value !== "") {
        const kind = value.startsWith("@")
          ? "at-rule" as const
          : "qualified-rule" as const;
        rules.push({
          block: stripped.slice(boundary.position + 1, blockEnd),
          depth,
          kind,
          parent,
          prelude: value,
        });
        walk(
          boundary.position + 1,
          blockEnd,
          kind,
          depth + 1,
        );
      } else {
        walk(
          boundary.position + 1,
          blockEnd,
          "qualified-rule",
          depth + 1,
        );
      }
      position = blockEnd + 1;
    }
  };
  walk(0, stripped.length, "stylesheet", 0);
  return { failures, rules };
}

function cssRulePreludes(source: string): readonly CssRulePrelude[] {
  return parsedCssRules(source).rules.map(({ kind, prelude }) => ({
    kind,
    value: prelude,
  }));
}

/** Qualified-rule selector preludes, including rules nested in at-rules. */
export function cssQualifiedRuleSelectors(
  source: string,
): readonly string[] {
  return cssRulePreludes(source).flatMap(({ kind, value }) =>
    kind === "qualified-rule" ? [value] : []
  );
}

/** Qualified CSS rules, including rules nested inside grouping at-rules. */
export function cssQualifiedRuleBlocks(source: string): {
  readonly failures: readonly string[];
  readonly rules: readonly CssQualifiedRuleBlock[];
} {
  const parsed = parsedCssRules(source);
  return {
    failures: parsed.failures,
    rules: parsed.rules.flatMap((rule) =>
      rule.kind === "qualified-rule"
        ? [{
          block: rule.block,
          depth: rule.depth,
          parent: rule.parent,
          selector: rule.prelude,
        }]
        : []
    ),
  };
}

/** Decoded class-selector identifiers from one selector prelude. */
export function cssSelectorClassNames(
  selector: string,
): readonly string[] {
  const source = stripCssComments(selector).css;
  const classes: string[] = [];
  const isWhitespace = (character: string): boolean =>
    /[\t\n\f\r ]/.test(character);
  const whitespaceEnd = (start: number): number => {
    let end = start;
    while (isWhitespace(source[end] ?? "")) end += 1;
    return end;
  };
  const attributeEnd = (start: number): number => {
    let position = start + 1;
    while (position < source.length) {
      const character = source[position];
      if (character === "'" || character === '"') {
        position = skipCssString(source, position);
        continue;
      }
      if (character === "\\") {
        position = cssEscapeEnd(source, position);
        continue;
      }
      if (character === "]") return position + 1;
      position += 1;
    }
    return source.length;
  };
  const attributeClass = (
    start: number,
  ):
    | { readonly end: number; readonly names: readonly string[] }
    | undefined => {
    let position = whitespaceEnd(start + 1);
    const attribute = cssIdentifier(source, position);
    if (
      attribute === undefined ||
      attribute.value.toLowerCase() !== "class"
    ) {
      return undefined;
    }
    position = whitespaceEnd(attribute.end);
    const operator = source.slice(position, position + 2) === "~="
      ? "~="
      : source[position] === "="
      ? "="
      : undefined;
    if (operator === undefined) return undefined;
    position = whitespaceEnd(position + operator.length);

    const quote = source[position];
    let valueText: string;
    if (quote === "'" || quote === '"') {
      const end = skipCssString(source, position);
      if (end > source.length || source[end - 1] !== quote) return undefined;
      valueText = decodeCssEscapes(source.slice(position + 1, end - 1));
      position = end;
    } else {
      const value = cssIdentifier(source, position);
      if (value === undefined) return undefined;
      valueText = value.value;
      position = value.end;
    }

    const valueEnd = position;
    position = whitespaceEnd(position);
    let modifier: string | undefined;
    const parsedModifier = cssIdentifier(source, position);
    if (parsedModifier !== undefined) {
      if (position === valueEnd) return undefined;
      modifier = parsedModifier.value.toLowerCase();
      if (modifier !== "i" && modifier !== "s") return undefined;
      position = whitespaceEnd(parsedModifier.end);
    }
    if (source[position] !== "]") return undefined;
    const names = operator === "~="
      ? isWhitespace(valueText) || valueText === "" ? [] : [valueText]
      : valueText.split(/[\t\n\f\r ]+/).filter(Boolean);
    return {
      end: position + 1,
      names: modifier === "i" ? names.map((name) => name.toLowerCase()) : names,
    };
  };
  let position = 0;
  while (position < source.length) {
    const character = source[position];
    if (character === "'" || character === '"') {
      position = skipCssString(source, position);
      continue;
    }
    if (character === "[") {
      const attribute = attributeClass(position);
      if (attribute !== undefined) {
        classes.push(...attribute.names);
        position = attribute.end;
        continue;
      }
      position = attributeEnd(position);
      continue;
    }
    if (character !== ".") {
      position += 1;
      continue;
    }
    const identifier = cssIdentifier(source, position + 1);
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
