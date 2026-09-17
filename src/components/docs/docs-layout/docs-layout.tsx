import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

interface DocsLayoutCommonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The document itself, rendered inside the `<main>` landmark. */
  readonly children: ReactNode;
  /** The `<main>` element's id, which a skip link targets; defaults to `main`. */
  readonly mainId?: string;
  /** Contents-rail content, shown beside the document when the allocation has room for three columns. */
  readonly rail?: ReactNode;
  /** Accessible name of the rail's complementary landmark. */
  readonly railLabel?: string;
}

/** Layout props options with a navigation column that becomes the drawer. */
export interface DocsLayoutNavigationProps extends DocsLayoutCommonProps {
  /** Site navigation for the first column: in flow, sticky, or an off-canvas drawer by allocation. */
  readonly navigation: ReactNode;
  /** The navigation element's id, which the drawer toggle names through `aria-controls`. */
  readonly navigationId: string;
  /** The dialog name the drawer behaviour gives the open navigation. */
  readonly navigationLabel?: string;
  /** Further attributes for the navigation element. */
  readonly navigationProps?: Omit<
    HTMLAttributes<HTMLElement>,
    "id" | "className" | "children"
  >;
  /** Whether to render the veil the drawer behaviour reveals behind the open navigation; defaults to `true`. */
  readonly veil?: boolean;
}

/** Layout props options without a navigation column. */
export interface DocsLayoutPlainProps extends DocsLayoutCommonProps {
  readonly navigation?: undefined;
  readonly navigationId?: never;
  readonly navigationLabel?: never;
  readonly navigationProps?: never;
  readonly veil?: never;
}

/** Props options for the Docs layout component. */
export type DocsLayoutProps = DocsLayoutNavigationProps | DocsLayoutPlainProps;

/**
 * Documentation reading shell: a navigation column, one `<main>` landmark,
 * and an optional contents rail in a three-column grid that drops the rail
 * at a medium allocation and turns the navigation into an off-canvas drawer
 * at a narrow one. The static markup carries `data-discern-docs-layout`,
 * the navigation's `data-discern-docs-drawer-label`, and the veil's
 * `data-discern-docs-drawer-veil`; the `docs-drawer` behaviour activates a
 * consumer's toggle control that carries `data-discern-docs-drawer-toggle`
 * and `aria-controls={navigationId}`. Without the behaviour the navigation
 * stays in normal flow above the document.
 */
export const DocsLayout: DiscernComponent<HTMLDivElement, DocsLayoutProps> =
  forwardRef<HTMLDivElement, DocsLayoutProps>(function DocsLayout(
    {
      navigation,
      navigationId,
      navigationLabel = "Navigation",
      navigationProps,
      veil = true,
      mainId = "main",
      rail,
      railLabel = "Page context",
      className,
      children,
      ...props
    },
    ref,
  ) {
    const hasNavigation = navigation !== undefined && navigation !== null;
    return (
      <div
        ref={ref}
        className={classNames("discern-docs-layout", className)}
        data-discern-docs-layout=""
        {...props}
      >
        {hasNavigation && veil
          ? (
            <div
              className="discern-docs-layout__veil"
              data-discern-docs-drawer-veil=""
              hidden
            />
          )
          : null}
        <div className="discern-docs-layout__columns">
          {hasNavigation
            ? (
              <aside
                id={navigationId}
                className="discern-docs-layout__navigation"
                data-discern-docs-drawer-label={navigationLabel}
                {...navigationProps}
              >
                {navigation}
              </aside>
            )
            : null}
          <main id={mainId} className="discern-docs-layout__main">
            {children}
          </main>
          {rail
            ? (
              <aside
                className="discern-docs-layout__rail"
                aria-label={railLabel}
              >
                {rail}
              </aside>
            )
            : null}
        </div>
      </div>
    );
  });
