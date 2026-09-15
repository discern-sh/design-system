import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteHeader, type SiteHeaderVariant } from "../src/react.ts";
import SiteHeaderExamples from "../src/components/marketing/site-header/site-header.examples.tsx";

const navItems = [
  { label: "Overview", href: "/overview" },
  { label: "Guides", href: "/guides", current: "section" },
  { label: "Install", href: "/guides/install", current: "page" },
] as const;

function headerMarkup(variant: SiteHeaderVariant): string {
  return renderToStaticMarkup(
    <SiteHeader brand="Example brand" navItems={navItems} variant={variant} />,
  );
}

Deno.test("a current navigation item keeps package-owned anchor markup in both variants", () => {
  for (const variant of ["standard", "campaign"] as const) {
    const html = headerMarkup(variant);
    // The ordinary item carries no current semantics at all.
    assertStringIncludes(html, '<a href="/overview">Overview</a>');
    assertStringIncludes(
      html,
      '<a href="/guides" aria-current="true">Guides</a>',
    );
    assertStringIncludes(
      html,
      '<a href="/guides/install" aria-current="page">Install</a>',
    );
    // Exactly one destination may be the page being read.
    assertEquals(html.match(/aria-current="page"/g)?.length, 1);
    assertEquals(html.match(/aria-current/g)?.length, 2);
  }
});

Deno.test("current-page treatment is carried by the accessible attribute, not a private class", () => {
  const html = headerMarkup("standard");
  // Styling hangs off aria-current, so the visual and assistive contracts
  // cannot drift apart.
  assertEquals(html.match(/class="[^"]*current[^"]*"/g), null);
  assertStringIncludes(html, 'class="discern-site-header__nav"');
});

Deno.test("canonical Site header examples demonstrate both current relationships", () => {
  const html = renderToStaticMarkup(<SiteHeaderExamples />);
  assertStringIncludes(html, 'href="#overview" aria-current="page"');
  assertStringIncludes(html, 'href="#evidence" aria-current="true"');
});
