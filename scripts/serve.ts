import {
  MARKDOWN_BROWSER_LEGACY_REVIEW_PATH,
  MARKDOWN_BROWSER_REVIEW_PATH,
  renderMarkdownBrowserReviewPage,
} from "../catalogue/markdown-browser-review.ts";
import { canonicalCatalogueShellPathname } from "../catalogue/routes.ts";
import {
  COMPONENT_EXAMPLE_IMAGE_REVIEW_PATH,
  renderComponentExampleImageReviewPage,
} from "../catalogue/example-images/review.ts";

const ROOT = new URL("../", import.meta.url);
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
  ".tsx": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

/** Map the landing front door and mounted Catalogue URL space onto files. */
export function catalogueFilePath(rawPathname: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch {
    return null;
  }
  if (pathname.includes("..") || pathname.includes("\0")) return null;
  if (pathname === "/") return "./dist/landing/index.html";
  if (pathname.startsWith("/catalogue/")) {
    const mountedPath = pathname.slice("/catalogue".length);
    pathname = /^\/(?:dist|src|assets)\//.test(mountedPath)
      ? mountedPath
      : `/catalogue${mountedPath}`;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  return `.${pathname}`;
}

function safePath(url: URL): URL | null {
  const path = catalogueFilePath(url.pathname);
  return path === null ? null : new URL(path, ROOT);
}

function isCatalogueClientRoute(pathname: string): boolean {
  if (!pathname.startsWith("/catalogue/") || !pathname.endsWith("/")) {
    return false;
  }
  return ![
    "/catalogue/builder/",
    "/catalogue/example-images/",
    "/catalogue/reviews/",
  ].some((mount) => pathname.startsWith(mount));
}

async function fileResponse(target: URL): Promise<Response> {
  const body = await Deno.readFile(target);
  const extension = target.pathname.slice(target.pathname.lastIndexOf("."));
  return new Response(body, {
    headers: {
      "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
    },
  });
}

/** Source-rendered review routes that must survive replacement of build output. */
export const catalogueReviewRoutes = Object.freeze([
  Object.freeze({
    pathname: COMPONENT_EXAMPLE_IMAGE_REVIEW_PATH,
    render: renderComponentExampleImageReviewPage,
  }),
  Object.freeze({
    pathname: MARKDOWN_BROWSER_REVIEW_PATH,
    render: renderMarkdownBrowserReviewPage,
  }),
]);

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === MARKDOWN_BROWSER_LEGACY_REVIEW_PATH) {
      url.pathname = MARKDOWN_BROWSER_REVIEW_PATH;
      return Response.redirect(url, 307);
    }
    for (const route of catalogueReviewRoutes) {
      if (url.pathname === route.pathname.slice(0, -1)) {
        url.pathname = route.pathname;
        return Response.redirect(url, 307);
      }
      if (url.pathname === route.pathname) {
        return new Response(route.render(), {
          headers: {
            "cache-control": "no-store",
            "content-type": "text/html; charset=utf-8",
          },
        });
      }
    }
    for (const legacyMount of ["/style-guide", "/styleguide"] as const) {
      if (
        url.pathname === legacyMount ||
        url.pathname.startsWith(`${legacyMount}/`)
      ) {
        const suffix = url.pathname.slice(legacyMount.length);
        url.pathname = `/catalogue${suffix === "" ? "/" : suffix}`;
        return Response.redirect(url, 307);
      }
    }
    if (url.pathname === "/catalogue") {
      url.pathname = "/catalogue/";
      return Response.redirect(url, 307);
    }
    const shellPathname = canonicalCatalogueShellPathname(url.pathname);
    if (shellPathname !== null) {
      if (url.pathname !== shellPathname) {
        url.pathname = shellPathname;
        return Response.redirect(url, 307);
      }
      url.pathname = "/catalogue/";
    }
    const target = safePath(url);
    if (!target) return new Response("Bad request", { status: 400 });
    try {
      return await fileResponse(target);
    } catch {
      if (isCatalogueClientRoute(url.pathname)) {
        try {
          return await fileResponse(new URL("./catalogue/index.html", ROOT));
        } catch {
          // The shell itself is absent; preserve the original missing response.
        }
      }
      return new Response("Not found", { status: 404 });
    }
  },
};
