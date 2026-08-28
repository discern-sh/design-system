/** Human projection of strict Builder validation. Technical facts stay intact. */
export interface ProjectedBuilderIssue {
  readonly message: string;
  readonly technical: string;
}

function offsetLocation(source: string, offset: number): {
  readonly line: number;
  readonly column: number;
} {
  const prefix = source.slice(0, Math.max(0, offset));
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function syntaxLocation(source: string, message: string): {
  readonly line: number;
  readonly column: number;
} {
  const explicit = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (explicit !== null) {
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  }
  const position = /position\s+(\d+)/i.exec(message);
  return offsetLocation(
    source,
    position === null ? source.length : Number(position[1]),
  );
}

function shortSyntaxReason(message: string): string {
  const reason = message
    .replace(/^SyntaxError:\s*/i, "")
    .replace(/\s+in JSON at position[\s\S]*$/i, "")
    .replace(/\s+at position[\s\S]*$/i, "")
    .replace(/\s*\(line\s+\d+\s+column\s+\d+\)\s*$/i, "")
    .replace(/^JSON Parse error:\s*/i, "")
    .trim();
  if (/unexpected end/i.test(reason)) return "finish the JSON value";
  if (/property name|double-quoted/i.test(reason)) {
    return "use a quoted property name or close the object";
  }
  if (/unexpected token/i.test(reason)) return "remove the unexpected token";
  return reason === "" ? "enter valid JSON" : reason.toLowerCase();
}

/** A syntax-only draft check. Policy acceptance remains the strict authority. */
export function projectJsonDraftIssue(
  source: string,
  humanPath: string,
): ProjectedBuilderIssue | null {
  if (source.trim() === "") return null;
  try {
    JSON.parse(source);
    return null;
  } catch (error) {
    const technical = error instanceof Error ? error.message : String(error);
    const { line, column } = syntaxLocation(source, technical);
    return {
      message: `Fix ${humanPath}: line ${String(line)}, column ${
        String(column)
      } — ${shortSyntaxReason(technical)}.`,
      technical,
    };
  }
}

function policyRemedy(message: string): string {
  if (/valid JSON/i.test(message)) return "enter valid JSON";
  if (/JSON object/i.test(message)) return "use a JSON object";
  if (/cannot override modeled prop/i.test(message)) {
    return "remove the prop already controlled above";
  }
  if (/executable .*URL|javascript:|data:/i.test(message)) {
    return "remove the executable URL";
  }
  if (
    /event handler|^on[A-Z]|dangerouslySetInnerHTML|\bref\b|\bkey\b/i.test(
      message,
    )
  ) {
    return "remove the unsafe React prop";
  }
  if (/limit|too many|exceeds|depth/i.test(message)) {
    return "reduce this value to the stated limit";
  }
  return "change this value so the component can accept it";
}

/** Project one policy rejection to its human control while retaining proof. */
export function projectPolicyIssue(
  technical: string,
  humanPath: string,
): ProjectedBuilderIssue {
  return {
    message: `Fix ${humanPath}: ${policyRemedy(technical)}.`,
    technical,
  };
}
