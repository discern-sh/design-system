/** Settled navigation state for browser tests and gates, and the one place they read a page URL. */
import type { Page } from "playwright-core";
import { BROWSER_STATE_TIMEOUT_MS } from "./browser-conformance-support.ts";

/** URL facts a check expects once a navigating action has settled. */
export interface UrlState {
  /** The exact path. */
  readonly pathname?: string;
  /** The exact fragment with its leading `#`, or `""` for none. */
  readonly hash?: string;
  /** Exact query values by name; `null` requires the parameter's absence. */
  readonly searchParams?: Readonly<Record<string, string | null>>;
}

/** A URL state, or a predicate for facts a state cannot name. */
export type UrlExpectation = UrlState | ((url: URL) => boolean);

/** Whether a URL satisfies an expectation. */
export function urlMatches(url: URL, expectation: UrlExpectation): boolean {
  if (typeof expectation === "function") return expectation(url);
  const { hash, pathname, searchParams = {} } = expectation;
  return (pathname === undefined || url.pathname === pathname) &&
    (hash === undefined || url.hash === hash) &&
    Object.entries(searchParams).every(([name, value]) =>
      url.searchParams.get(name) === value
    );
}

/** Name an expectation in a failure message. */
export function describeUrlExpectation(expectation: UrlExpectation): string {
  if (typeof expectation === "function") return "a matching URL";
  const { hash, pathname, searchParams = {} } = expectation;
  const facts = [
    ...(pathname === undefined ? [] : [`path ${pathname}`]),
    ...(hash === undefined ? [] : [`hash ${hash === "" ? "(none)" : hash}`]),
    ...Object.entries(searchParams).map(([name, value]) =>
      value === null ? `no ${name}` : `${name}=${value}`
    ),
  ];
  return facts.length === 0 ? "any URL" : facts.join(", ");
}

/**
 * Wait until the page URL reaches the expected state, then return that URL.
 *
 * Playwright can resolve a navigating action before `page.url()` reports its
 * result: a history traversal, Enter on a link, a click, or input that
 * application code writes into the URL. A traversal also resolves on the next
 * navigation event, which can be one an earlier action left in flight, so
 * await each action's URL before a later traversal depends on it. Expect the
 * state the action produces, not one the page already held before it.
 */
export async function expectUrl(
  page: Page,
  expectation: UrlExpectation,
  message: string,
): Promise<URL> {
  const settled: { url?: URL } = {};
  try {
    await page.waitForURL((url) => {
      if (!urlMatches(url, expectation)) return false;
      settled.url = url;
      return true;
    }, { timeout: BROWSER_STATE_TIMEOUT_MS, waitUntil: "commit" });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    throw new Error(
      `${message}: expected ${
        describeUrlExpectation(expectation)
      } within ${BROWSER_STATE_TIMEOUT_MS}ms, observed ${page.url()}`,
    );
  }
  if (settled.url === undefined) {
    throw new Error(`${message}: the URL wait resolved without a match`);
  }
  return settled.url;
}

const FRAGMENT_PROBE = "discernFragmentNavigation";

/**
 * Run an action that moves the page to `hash`, then wait until the URL shows
 * it and the page has dispatched every `hashchange` the navigation queued.
 *
 * Page listeners for that event run in a later task; the article runtime moves
 * focus from one. Left pending, that task can run between Playwright focusing
 * the next control and pressing a key, so the key reaches the previous
 * fragment's target instead. A navigation queues the event exactly when its
 * Navigation API `navigate` event reports `hashChange`, so history writes
 * from application code wait for nothing. A page that runs no script
 * listeners has none to wait for. This listener, added after the page's own,
 * runs after them.
 */
export async function followFragment(
  page: Page,
  hash: string,
  action: () => Promise<unknown>,
  message: string,
): Promise<URL> {
  const armed = await page.evaluate((key) => {
    Reflect.get(Reflect.get(globalThis, key) ?? {}, "listening")?.abort();
    let scripted = false;
    addEventListener(key, () => {
      scripted = true;
    }, { once: true });
    dispatchEvent(new Event(key));
    if (!scripted) return false;
    const navigation: unknown = Reflect.get(globalThis, "navigation");
    if (!(navigation instanceof EventTarget)) {
      throw new Error("followFragment needs the Navigation API");
    }
    const state = {
      queued: 0,
      dispatched: 0,
      listening: new AbortController(),
    };
    const { signal } = state.listening;
    Reflect.set(globalThis, key, state);
    navigation.addEventListener("navigate", (event) => {
      if (Reflect.get(event, "hashChange") === true) state.queued += 1;
    }, { signal });
    addEventListener("hashchange", () => {
      state.dispatched += 1;
    }, { signal });
    return true;
  }, FRAGMENT_PROBE);
  await action();
  const url = await expectUrl(page, { hash }, message);
  if (!armed) return url;
  try {
    await page.waitForFunction(
      (key) => {
        const state = Reflect.get(globalThis, key);
        return state === undefined || state.dispatched >= state.queued;
      },
      FRAGMENT_PROBE,
      { timeout: BROWSER_STATE_TIMEOUT_MS },
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    throw new Error(
      `${message}: ${hash} did not dispatch its hashchange within ${BROWSER_STATE_TIMEOUT_MS}ms`,
    );
  }
  await page.evaluate((key) => {
    Reflect.get(Reflect.get(globalThis, key) ?? {}, "listening")?.abort();
    Reflect.deleteProperty(globalThis, key);
  }, FRAGMENT_PROBE);
  return url;
}
