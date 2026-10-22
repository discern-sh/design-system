/**
 * Line-break opportunities for visible paths, shared by every Workflow
 * Component that prints a path, so long paths wrap at segments.
 *
 * @module
 */

import type { ReactNode } from "react";

/** Split visible path text after each separator, with a break opportunity between segments. */
export function breakAfterSeparators(text: string): ReactNode[] {
  return text.split(/(?<=[\\/])/u).flatMap((segment, index) =>
    index === 0 ? [segment] : [<wbr key={index} />, segment]
  );
}
