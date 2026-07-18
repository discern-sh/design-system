import { useEffect } from "react";

const restoredFragments = new WeakMap<Document, string>();

function fragmentId(hash: string): string | undefined {
  if (!hash.startsWith("#") || hash.length === 1) return undefined;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/** Restore the browser's initial fragment after a client-rendered navigation tree mounts. */
export function useInitialFragmentTarget(): void {
  useEffect(() => {
    if (typeof document === "undefined" || typeof location === "undefined") {
      return;
    }
    const hash = location.hash;
    if (!hash || restoredFragments.get(document) === hash) return;
    const id = fragmentId(hash);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    target.scrollIntoView({
      behavior: "instant" as ScrollBehavior,
      block: "start",
    });
    restoredFragments.set(document, hash);
  }, []);
}
