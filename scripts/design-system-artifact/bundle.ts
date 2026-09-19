/**
 * Bundle the whole React adapter (`src/react.ts`) as one classic script that
 * reads React 18 from `window.React` and `window.ReactDOM` and assigns
 * `window.Discern`: the shape the artifact's page loads for its previews and
 * hands to Claude Design.
 */
import { fromFileUrl } from "@std/path";
import { writeText } from "./support.ts";

const REACT_SHIM = `const R = globalThis.React;
if (!R) throw new Error("The Discern bundle needs window.React (React 18) loaded first");
export default R;
export const { Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, cloneElement, createContext, createElement, createFactory, createRef, forwardRef, isValidElement, lazy, memo, startTransition, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition, version } = R;
`;

const JSX_SHIM = `const R = globalThis.React;
if (!R) throw new Error("The Discern bundle needs window.React (React 18) loaded first");
export const Fragment = R.Fragment;
function make(type, props, key) {
  if (key !== undefined) props = { ...props, key };
  return R.createElement(type, props);
}
export const jsx = make;
export const jsxs = make;
export const jsxDEV = make;
`;

const DOM_SHIM = `const D = globalThis.ReactDOM;
export default D;
export const createPortal = (...args) => D.createPortal(...args);
export const flushSync = (...args) => D.flushSync(...args);
export const createRoot = (...args) => D.createRoot(...args);
export const hydrateRoot = (...args) => D.hydrateRoot(...args);
export const renderToStaticMarkup = () => { throw new Error("renderToStaticMarkup is not available in the browser bundle"); };
export const renderToString = renderToStaticMarkup;
`;

/** Bundle the adapter and write `project/components/bundle.js`; returns its byte size. */
export async function buildBundle(
  root: URL,
  out: URL,
  components: readonly string[],
): Promise<number> {
  const work = new URL("bundle-work/", out);
  await writeText(new URL("shims/react.js", work), REACT_SHIM);
  await writeText(new URL("shims/jsx-runtime.js", work), JSX_SHIM);
  await writeText(new URL("shims/react-dom.js", work), DOM_SHIM);
  const entry = new URL("entry.ts", work);
  await writeText(
    entry,
    `import * as Discern from ${
      JSON.stringify(new URL("src/react.ts", root).href)
    };\n(globalThis as unknown as { Discern: unknown }).Discern = Discern;\n`,
  );
  const config = JSON.parse(
    await Deno.readTextFile(new URL("deno.json", root)),
  ) as { imports?: Record<string, string> };
  const shim = (name: string) => new URL(`shims/${name}`, work).href;
  const importMap = new URL("import-map.json", work);
  await writeText(
    importMap,
    JSON.stringify({
      imports: {
        ...config.imports,
        "react": shim("react.js"),
        "react/jsx-runtime": shim("jsx-runtime.js"),
        "react/jsx-dev-runtime": shim("jsx-runtime.js"),
        "react-dom": shim("react-dom.js"),
        "react-dom/client": shim("react-dom.js"),
        "react-dom/server": shim("react-dom.js"),
      },
    }),
  );
  const output = new URL("bundle.js", work);
  const result = await new Deno.Command(Deno.execPath(), {
    cwd: fromFileUrl(root),
    args: [
      "bundle",
      "--config",
      fromFileUrl(new URL("deno.json", root)),
      "--import-map",
      fromFileUrl(importMap),
      "--platform=browser",
      "--format=iife",
      "--minify",
      "--output",
      fromFileUrl(output),
      fromFileUrl(entry),
    ],
    stdout: "null",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `deno bundle failed:\n${new TextDecoder().decode(result.stderr)}`,
    );
  }
  const bundled = await Deno.readTextFile(output);
  if (bundled.includes("</script")) {
    throw new Error(
      "The bundle contains a literal </script, which consumers cannot inline",
    );
  }
  // A literal HTML comment opener would end an inline script early; the escape
  // reads the same inside string literals and regular expressions.
  const patched = bundled.replaceAll("<!--", "\\x3c!--");
  const header = `/* @ds-bundle: ${
    JSON.stringify({
      format: 4,
      namespace: "Discern",
      components: components.map((name) => ({ name })),
    })
  } */\n`;
  const script = header + patched;
  await writeText(new URL("project/components/bundle.js", out), script);
  return new TextEncoder().encode(script).byteLength;
}
