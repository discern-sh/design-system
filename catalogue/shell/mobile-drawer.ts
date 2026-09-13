import { useEffect, useRef, useState } from "react";

const drawerMedia = "(max-width: 850px)";
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Complete modal enhancement for the one shared narrow-screen navigation. */
export function useMobileDrawer(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [narrow, setNarrow] = useState(() =>
    globalThis.matchMedia(drawerMedia).matches
  );

  useEffect(() => {
    const query = globalThis.matchMedia(drawerMedia);
    const synchronise = (): void => {
      setNarrow(query.matches);
      if (!query.matches) onOpenChange(false);
    };
    synchronise();
    query.addEventListener("change", synchronise);
    return () => query.removeEventListener("change", synchronise);
  }, []);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (drawer === null) return;
    const focusNavigation = (): void => {
      (drawer.querySelector<HTMLElement>('a[aria-current="location"]') ??
        drawer.querySelector<HTMLElement>('a[aria-current="page"]') ??
        drawer.querySelector<HTMLElement>("a[href]"))?.focus();
    };
    if (narrow && !open && drawer.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
    if (!narrow && document.activeElement === triggerRef.current) {
      focusNavigation();
    }
    drawer.inert = narrow && !open;
    if (!narrow || !open) return;

    const background = [...document.querySelectorAll<HTMLElement>(
      "[data-discern-drawer-background]",
    )];
    for (const element of background) element.inert = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = (): HTMLElement[] =>
      [...drawer.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => !element.inert && element.getClientRects().length > 0,
      );
    const frame = requestAnimationFrame(() => {
      const close = drawer.querySelector<HTMLElement>(
        ".discern-catalogue-sidebar__close",
      );
      (close ?? focusable()[0])?.focus();
    });
    const containFocus = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const candidates = focusable();
      const first = candidates[0];
      const last = candidates.at(-1);
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", containFocus, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", containFocus, true);
      document.body.style.overflow = previousOverflow;
      for (const element of background) element.inert = false;
      if (globalThis.matchMedia(drawerMedia).matches) {
        triggerRef.current?.focus();
      } else {
        focusNavigation();
      }
    };
  }, [narrow, onOpenChange, open]);

  return {
    drawerRef,
    triggerRef,
    narrow,
    drawerProps: narrow && open
      ? {
        role: "dialog" as const,
        "aria-modal": true as const,
        "aria-labelledby": "discern-catalogue-navigation-title",
      }
      : {},
  } as const;
}
