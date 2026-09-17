import { useId } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { IconButton } from "../../core/icon-button/icon-button.tsx";
import { Paragraph } from "../../editorial/paragraph/paragraph.tsx";
import { Prose } from "../../editorial/prose/prose.tsx";
import { TableOfContents } from "../../editorial/table-of-contents/table-of-contents.tsx";
import { AnchorHeading } from "../anchor-heading/anchor-heading.tsx";
import { DocsHeader } from "../docs-header/docs-header.tsx";
import { DocsNav } from "../docs-nav/docs-nav.tsx";
import { Pager } from "../pager/pager.tsx";
import meta, { componentExampleVocabulary } from "./docs-layout.meta.ts";
import { DocsLayout } from "./docs-layout.tsx";

/** Three strokes, so the toggle needs no icon asset. */
function MenuGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Document({ id }: { readonly id: (name: string) => string }) {
  return (
    <Prose>
      <AnchorHeading id={id("install")} level={1}>
        Getting started
      </AnchorHeading>
      <Paragraph>
        Install the tool, then run its setup command from the project root. The
        command writes one configuration file and explains what it configured,
        so the first run doubles as a tour.
      </Paragraph>
      <AnchorHeading id={id("configure")}>Configure</AnchorHeading>
      <Paragraph>
        Every setting has a default that suits a fresh project. Change one only
        when the generated file's own comment says why you would, and keep the
        file in version control so the next contributor inherits the choice.
      </Paragraph>
      <AnchorHeading id={id("verify")}>Verify</AnchorHeading>
      <Paragraph>
        The check command reports each configured step with its outcome. Read a
        failure's location and rule before changing anything; the message names
        the next valid action.
      </Paragraph>
      <Pager
        previous={{ label: "Overview", href: "#overview" }}
        next={{ label: "Configuration", href: "#configuration" }}
      />
    </Prose>
  );
}

function Contents({ id }: { readonly id: (name: string) => string }) {
  return (
    <TableOfContents
      title="On this page"
      items={[
        { label: "Install", href: `#${id("install")}`, current: true },
        { label: "Configure", href: `#${id("configure")}` },
        { label: "Verify", href: `#${id("verify")}` },
      ]}
    />
  );
}

/**
 * The complete shell: a sticky Docs header carrying the drawer toggle, then
 * navigation, the document, and the contents rail. The toggle renders hidden
 * and inert to the layout; the selected docs-drawer behaviour reveals it
 * when the allocation makes the navigation a drawer.
 */
function DocumentationShellExample() {
  const prefix = `docs-layout-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  const navigationId = id("navigation");
  return (
    <div
      data-discern-example-docs-viewport
      style={{ maxHeight: "40rem", overflow: "auto" }}
    >
      <DocsHeader
        brand={<a href="#top">Lorem manual</a>}
        actions={
          <IconButton
            icon={<MenuGlyph />}
            label="Open navigation"
            hidden
            data-discern-docs-drawer-toggle=""
            data-discern-open-label="Open navigation"
            data-discern-close-label="Close navigation"
            aria-controls={navigationId}
            aria-expanded={false}
          />
        }
      >
        <span>Search</span>
      </DocsHeader>
      <DocsLayout
        navigationId={navigationId}
        navigationLabel="Manual navigation"
        navigation={
          <DocsNav
            label="Manual"
            sections={[
              {
                title: "Orientation",
                items: [
                  { label: "Overview", href: "#overview" },
                  {
                    label: "Getting started",
                    href: "#getting-started",
                    current: true,
                  },
                  { label: "Concepts", href: "#concepts" },
                ],
              },
              {
                title: "Reference",
                items: [
                  { label: "Configuration", href: "#configuration" },
                  { label: "Glossary", href: "#glossary" },
                ],
              },
            ]}
          />
        }
        rail={<Contents id={id} />}
      >
        <Document id={id} />
      </DocsLayout>
    </div>
  );
}

/** A page with no site navigation keeps the document and its rail. */
function DocumentAndRailExample() {
  const prefix = `docs-layout-plain-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <DocsLayout mainId={id("main")} rail={<Contents id={id} />}>
      <Document id={id} />
    </DocsLayout>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{
    id: "default",
    Example: DocumentationShellExample,
    capture: {
      selectors: ["[data-discern-example-docs-viewport]"],
      framing: {
        mode: "allocation",
        reason:
          "The scrolling allocation keeps the complete shell available while the frame shows its header, navigation, opening document, and rail.",
      },
    },
  }, {
    id: "plain",
    Example: DocumentAndRailExample,
  }],
);

export default DocumentationShellExample;
