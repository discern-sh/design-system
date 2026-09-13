import { useEffect, useRef } from "react";

/** Enhance native details without intercepting nested controls or outward Tab focus. */
export function useAppearanceDisclosure() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const disclosure = ref.current;
    if (!disclosure) return;
    const close = (restore: boolean): void => {
      disclosure.open = false;
      if (restore) disclosure.querySelector("summary")?.focus();
    };
    const outside = (event: Event): void => {
      if (
        !disclosure.open || !(event.target instanceof Node) ||
        disclosure.contains(event.target)
      ) return;
      close(
        event.type === "pointerdown" &&
          disclosure.contains(document.activeElement),
      );
    };
    const escape = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" || event.defaultPrevented || !disclosure.open
      ) return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return ref;
}
