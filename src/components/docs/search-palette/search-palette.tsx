import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  AnchorHTMLAttributes,
  ChangeEvent,
  DialogHTMLAttributes,
  InputHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";

/** Props for the {@linkcode SearchPalette} component. */
export interface SearchPaletteProps extends
  Omit<
    DialogHTMLAttributes<HTMLDialogElement>,
    "open" | "onClose" | "children"
  > {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly icon?: ReactNode;
  readonly hint?: ReactNode;
  readonly closeOnBackdrop?: boolean;
  readonly inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "placeholder" | "type" | "className"
  >;
  readonly children: ReactNode;
}

/** Modal command-palette search built on the native dialog, with a labelled search field, a results region, and a hint row. */
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

  useEffect(() => {
    const dialog = internalRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>): void => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onOpenChange(false);
    }
  };

  return (
    <dialog
      ref={internalRef}
      aria-label={label}
      className={classNames("discern-search-palette", className)}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onMouseDown={handleBackdrop}
      {...props}
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
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onValueChange?.(event.target.value)}
          autoFocus
          {...inputProps}
        />
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
