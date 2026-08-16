import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { validateSemanticInlineContent } from "../../../cli/semantic-inline.ts";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** One safe return target for one occurrence of a footnote reference. */
export interface FootnoteReturnReference {
  /** Safe URL reference, normally the fragment id of one inline occurrence. */
  readonly href: string;
  /** Visible occurrence label; repeated links default to their ordinal. */
  readonly label?: string;
}

/** One footnote item entry rendered by the Footnotes component. */
export interface FootnoteItem {
  /** Stable identifier shared by the definition and its inline references. */
  readonly id: string;
  /** Rich phrasing or one or more structural React blocks. */
  readonly content: ReactNode;
  /** Legacy single return target. */
  readonly backHref?: string;
  /** Ordered return targets when one definition is referenced more than once. */
  readonly backReferences?: readonly FootnoteReturnReference[];
}

/** Props for the {@linkcode Footnotes} component. */
export interface FootnotesProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly title?: ReactNode;
  readonly items: readonly FootnoteItem[];
}

function validateIdentifier(identifier: unknown, index: number): string {
  try {
    validateSemanticInlineContent([{
      kind: "footnote-reference",
      identifier,
    }]);
  } catch (cause) {
    throw new TypeError(
      `footnotes item ${index + 1} requires a valid stable id`,
      { cause },
    );
  }
  return identifier as string;
}

function validateReturnReference(
  reference: FootnoteReturnReference,
  itemIndex: number,
  referenceIndex: number,
): void {
  if (
    typeof reference !== "object" || reference === null ||
    Array.isArray(reference)
  ) {
    throw new TypeError(
      "footnotes return reference " + (referenceIndex + 1) +
        " for item " + (itemIndex + 1) + " must be an object",
    );
  }
  const label = reference.label ?? String(referenceIndex + 1);
  try {
    validateSemanticInlineContent([{
      kind: "link",
      label,
      destination: reference.href,
    }]);
  } catch (cause) {
    throw new TypeError(
      `footnotes item ${itemIndex + 1} return reference ${
        referenceIndex + 1
      } must carry a safe href and label`,
      { cause },
    );
  }
}

function validateItems(items: readonly FootnoteItem[]): void {
  const identifiers = new Set<string>();
  for (const [itemIndex, item] of items.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new TypeError(
        "footnotes item " + (itemIndex + 1) + " must be an object",
      );
    }
    const identifier = validateIdentifier(item.id, itemIndex);
    if (identifiers.has(identifier)) {
      throw new TypeError(
        `duplicate footnotes id ${JSON.stringify(identifier)}`,
      );
    }
    identifiers.add(identifier);
    if (item.backHref !== undefined && item.backReferences !== undefined) {
      throw new TypeError(
        `footnotes item ${
          itemIndex + 1
        } cannot combine backHref and backReferences`,
      );
    }
    if (item.backHref !== undefined) {
      validateReturnReference({ href: item.backHref }, itemIndex, 0);
    }
    if (item.backReferences !== undefined) {
      if (
        !Array.isArray(item.backReferences) ||
        item.backReferences.length === 0
      ) {
        throw new TypeError(
          `footnotes item ${
            itemIndex + 1
          } backReferences must be a non-empty array`,
        );
      }
      item.backReferences.forEach((reference, referenceIndex) =>
        validateReturnReference(reference, itemIndex, referenceIndex)
      );
    }
  }
}

/**
 * End-note definitions with unique stable anchors and ordered return links.
 *
 * The owning document resolves references to definitions; Footnotes rejects
 * missing or duplicate definition ids but does not infer definitions for
 * references outside its item set.
 */
export const Footnotes: DiscernComponent<HTMLElement, FootnotesProps> =
  forwardRef<HTMLElement, FootnotesProps>(function Footnotes(
    { title = "Notes & sources", items, className, ...props },
    ref,
  ) {
    validateItems(items);
    return (
      <section
        ref={ref}
        className={classNames("discern-footnotes", className)}
        {...props}
      >
        <header>
          <span aria-hidden="true">†</span>
          <h2>{title}</h2>
        </header>
        <ol>
          {items.map((item, index) => (
            <li id={item.id} key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>{item.content}</div>
              {item.backHref
                ? (
                  <a
                    href={item.backHref}
                    aria-label={`Return from note ${index + 1}`}
                  >
                    ↩
                  </a>
                )
                : null}
              {item.backReferences !== undefined
                ? (
                  <span className="discern-footnotes__returns">
                    {item.backReferences.map((reference, referenceIndex) => (
                      <a
                        href={reference.href}
                        aria-label={`Return from note ${
                          index + 1
                        } to reference ${referenceIndex + 1}`}
                        key={`${reference.href}-${referenceIndex}`}
                      >
                        ↩{reference.label ?? String(referenceIndex + 1)}
                      </a>
                    ))}
                  </span>
                )
                : null}
            </li>
          ))}
        </ol>
      </section>
    );
  });
