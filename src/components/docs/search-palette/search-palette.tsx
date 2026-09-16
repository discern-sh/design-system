import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  AnchorHTMLAttributes,
  ChangeEvent,
  DialogHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LiHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

interface SearchPaletteCommonProps {
  /** Accessible name of the dialog and its search field. */
  readonly label?: string;
  readonly placeholder?: string;
  /** The query: controlled beside `onValueChange`, otherwise the field's initial text. */
  readonly value?: string;
  readonly icon?: ReactNode;
  readonly hint?: ReactNode;
  /** Visible text of the close control. */
  readonly closeLabel?: string;
  /** Accessible name of the close control; defaults to `closeLabel` followed by the lower-cased `label`. */
  readonly closeAriaLabel?: string;
  /** Attributes for the search field, such as the combobox wiring a consumer script drives. */
  readonly inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "placeholder" | "type" | "className"
  >;
  readonly className?: string;
  /** The results region, usually a list, an empty message, and a status region. */
  readonly children: ReactNode;
}

type SearchPaletteNativeProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  keyof SearchPaletteCommonProps | "open" | "onClose"
>;

/** Controlled props options for the Search palette component. */
export type ControlledSearchPaletteProps =
  & SearchPaletteCommonProps
  & SearchPaletteNativeProps
  & {
    /** Whether the modal dialog is shown; React calls `showModal()` and `close()` to match. */
    readonly open: boolean;
    /** Receives the requested state after Escape, the close control, or the backdrop. */
    readonly onOpenChange: (open: boolean) => void;
    readonly onValueChange?: (value: string) => void;
    readonly closeOnBackdrop?: boolean;
  };

/** Static props options for the Search palette component. */
export type StaticSearchPaletteProps =
  & SearchPaletteCommonProps
  & SearchPaletteNativeProps
  & {
    readonly open?: never;
    readonly onOpenChange?: never;
    readonly onValueChange?: never;
    readonly closeOnBackdrop?: never;
  };

/** Props options for the Search palette component. */
export type SearchPaletteProps =
  | ControlledSearchPaletteProps
  | StaticSearchPaletteProps;

/**
 * Modal command-palette search built on the native dialog, with a labelled
 * search field, a results region, and a hint row, in one of two modes chosen
 * by `onOpenChange`. With it, React owns `showModal()`, dismissal, and the
 * field. Without it, the dialog renders closed with no effects or handlers
 * and stamps `data-discern-search-palette` on the dialog,
 * `data-discern-search-palette-input` on the field, and
 * `data-discern-search-palette-close` on the close control, so a consumer
 * script can bind the open, close, and query behaviour it owns; only the
 * static mode carries those hooks, so one activation is never handled twice.
 */
export const SearchPalette: DiscernComponent<
  HTMLDialogElement,
  SearchPaletteProps
> = forwardRef<HTMLDialogElement, SearchPaletteProps>(function SearchPalette(
  {
    open,
    onOpenChange,
    label = "Search",
    placeholder = "Type to search…",
    value,
    onValueChange,
    icon,
    hint,
    closeLabel = "Close",
    closeAriaLabel,
    closeOnBackdrop = true,
    inputProps,
    className,
    children,
    ...props
  },
  forwardedRef,
) {
  const internalRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(
    forwardedRef,
    () => internalRef.current as HTMLDialogElement,
    [],
  );
  const controlled = onOpenChange !== undefined;

  useEffect(() => {
    const dialog = internalRef.current;
    if (!controlled || !dialog) {
      return;
    }
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [controlled, open]);

  useEffect(() => {
    if (!controlled || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [controlled, open]);

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>): void => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onOpenChange?.(false);
    }
  };

  return (
    <dialog
      ref={internalRef}
      aria-label={label}
      className={classNames("discern-search-palette", className)}
      {...(controlled
        ? {
          onCancel: (event) => {
            event.preventDefault();
            onOpenChange(false);
          },
          onMouseDown: handleBackdrop,
        }
        : { "data-discern-search-palette": "" })}
      {...props}
      data-discern-floating-surface="surface"
    >
      <div className="discern-search-palette__field">
        {icon !== undefined && (
          <span className="discern-search-palette__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          className="discern-search-palette__input"
          type="search"
          aria-label={label}
          placeholder={placeholder}
          {...(controlled
            ? {
              value,
              onChange: (event: ChangeEvent<HTMLInputElement>) =>
                onValueChange?.(event.target.value),
              autoFocus: true,
            }
            : {
              defaultValue: value,
              "data-discern-search-palette-input": "",
            })}
          {...inputProps}
        />
        <button
          className="discern-search-palette__close"
          type="button"
          aria-label={closeAriaLabel ?? `${closeLabel} ${label.toLowerCase()}`}
          {...(controlled
            ? { onClick: () => onOpenChange(false) }
            : { "data-discern-search-palette-close": "" })}
        >
          {closeLabel}
        </button>
      </div>
      <div className="discern-search-palette__results">{children}</div>
      {hint !== undefined && (
        <div className="discern-search-palette__hint">{hint}</div>
      )}
    </dialog>
  );
});

/** Props for the {@linkcode SearchPaletteResult} component. */
export interface SearchPaletteResultProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "title"> {
  readonly title: ReactNode;
  readonly context?: ReactNode;
  readonly href: string;
}

/** One search destination: a linked title with optional location context. */
export const SearchPaletteResult: DiscernComponent<
  HTMLAnchorElement,
  SearchPaletteResultProps
> = forwardRef<HTMLAnchorElement, SearchPaletteResultProps>(
  function SearchPaletteResult(
    { title, context, href, className, ...props },
    ref,
  ) {
    return (
      <a
        ref={ref}
        className={classNames("discern-search-palette__result", className)}
        href={href}
        {...props}
      >
        <span className="discern-search-palette__result-title">{title}</span>
        {context !== undefined && (
          <span className="discern-search-palette__result-context">
            {context}
          </span>
        )}
      </a>
    );
  },
);

/** Props for the {@linkcode SearchPaletteList} component. */
export interface SearchPaletteListProps
  extends Omit<HTMLAttributes<HTMLUListElement>, "role"> {
  /** The listbox's accessible name. */
  readonly "aria-label"?: string;
  /** The listbox's identity, which a combobox field names through `aria-controls`. */
  readonly id?: string;
}

/**
 * The results listbox: a `<ul role="listbox">` owning
 * `discern-search-palette__list`, whose children are `role="option"` items
 * — {@linkcode SearchPaletteOption}, or the same anatomy a consumer script
 * renders — selected through the field's `aria-activedescendant`.
 */
export const SearchPaletteList: DiscernComponent<
  HTMLUListElement,
  SearchPaletteListProps
> = forwardRef<HTMLUListElement, SearchPaletteListProps>(
  function SearchPaletteList(
    { "aria-label": ariaLabel = "Search results", className, ...props },
    ref,
  ) {
    return (
      <ul
        ref={ref}
        role="listbox"
        aria-label={ariaLabel}
        className={classNames("discern-search-palette__list", className)}
        {...props}
      />
    );
  },
);

/** Props for the {@linkcode SearchPaletteOption} component. */
export interface SearchPaletteOptionProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, "role" | "title"> {
  readonly title: ReactNode;
  readonly context?: ReactNode;
  /** Whether this option is the one the field's `aria-activedescendant` names. */
  readonly selected?: boolean;
}

/**
 * One `role="option"` result inside {@linkcode SearchPaletteList}: the
 * `discern-search-palette__result` anatomy with its `__result-title` and
 * `__result-context`, which is also what a consumer script renders when it
 * builds results itself.
 */
export const SearchPaletteOption: DiscernComponent<
  HTMLLIElement,
  SearchPaletteOptionProps
> = forwardRef<HTMLLIElement, SearchPaletteOptionProps>(
  function SearchPaletteOption(
    { title, context, selected = false, className, ...props },
    ref,
  ) {
    return (
      <li
        ref={ref}
        role="option"
        aria-selected={selected}
        className={classNames("discern-search-palette__result", className)}
        {...props}
      >
        <span className="discern-search-palette__result-title">{title}</span>
        {context !== undefined && (
          <span className="discern-search-palette__result-context">
            {context}
          </span>
        )}
      </li>
    );
  },
);

/** Props for the {@linkcode SearchPaletteEmpty} component. */
export interface SearchPaletteEmptyProps
  extends HTMLAttributes<HTMLParagraphElement> {
  /** Hidden until a consumer reveals it; defaults to `true`. */
  readonly hidden?: boolean;
}

/** The empty-state message, owning `discern-search-palette__empty` and hidden by default. */
export const SearchPaletteEmpty: DiscernComponent<
  HTMLParagraphElement,
  SearchPaletteEmptyProps
> = forwardRef<HTMLParagraphElement, SearchPaletteEmptyProps>(
  function SearchPaletteEmpty({ hidden = true, className, ...props }, ref) {
    return (
      <p
        ref={ref}
        hidden={hidden}
        className={classNames("discern-search-palette__empty", className)}
        {...props}
      />
    );
  },
);

/** Props for the {@linkcode SearchPaletteStatus} component. */
export type SearchPaletteStatusProps = HTMLAttributes<HTMLDivElement>;

/** A visually hidden polite live region that announces result counts and load state. */
export const SearchPaletteStatus: DiscernComponent<
  HTMLDivElement,
  SearchPaletteStatusProps
> = forwardRef<HTMLDivElement, SearchPaletteStatusProps>(
  function SearchPaletteStatus({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={classNames(
          "discern-search-palette__status",
          "discern-visually-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
