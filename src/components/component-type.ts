import type {
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from "react";

/**
 * Explicit public type for the package's ref-forwarding components, so the
 * exported API carries declared types rather than inferred ones.
 */
export type DiscernComponent<Element, Props> = ForwardRefExoticComponent<
  PropsWithoutRef<Props> & RefAttributes<Element>
>;
