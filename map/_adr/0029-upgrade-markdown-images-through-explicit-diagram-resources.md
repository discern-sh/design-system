# ADR 0029: Upgrade Markdown images through explicit diagram resources

**Status**: accepted — generalised by [ADR-0031](0031-promote-markdown-images-through-one-resource-family.md), which serves this same promotion mechanism to a family of resource kinds

## Context

One documentation diagram has to remain useful in three forms: ordinary Markdown must name a portable generated SVG, the browser can render the live token-themed Diagram, and terminals need the diagram's semantic or enhanced projection rather than an opaque image file. Markdown does not carry the typed `DiagramSpec` that owns those semantics, and the renderer may not discover it by reading a file, fetching a URL, parsing SVG, or consulting product-local state.

The consumer already owns the build relationship between a typed spec and the asset path written by `renderDiagramSvg`. The integration boundary must admit that fact without inventing a Markdown dialect, changing unrelated image behaviour, or allowing the raw image alternative and the spec's accessibility facts to drift.

## Decision

Markdown callers may supply an immutable collection of explicit image-source to `DiagramSpec` resources. After the existing Markdown URL normalisation and safety policy, one shared neutral resolver validates the collection and promotes only a paragraph whose sole visible content is one image with a matching admitted source. The resolved block retains the normalised source and validated spec. React and CLI project that block through `Diagram` and `renderDiagramCli`; neither projection repeats matching logic or examines the SVG asset.

The Markdown image alternative must equal `diagramAltText(spec)` after the existing text adaptation. When an image title is present, it must equal the validated spec summary. A mismatch rejects the complete document before any projection. Duplicate normalised resource sources and invalid resources also reject deterministically. Valid unused resources are allowed so one corpus-level collection can be shared across documents, and resource order has no meaning.

An image mixed with prose, another image, or link phrasing remains ordinary image content. An unmatched image keeps the existing browser `<img>` and terminal `Image:` fallback. Version one adds no diagram fence, directive, MDX component, parser plugin, global registry, resolver callback, filesystem root, file read, fetch, SVG parser, or pre-rendered terminal escape hatch.

## Consequences

One standard Markdown document can display a generated asset in generic readers while explicit callers recover the same typed semantics for live web and terminal presentation. The spec stays authoritative for accessibility, and resource validation remains deterministic and React-free.

Callers must retain and supply the source-to-spec relationship they already used while generating assets. Renaming an asset requires changing both the ordinary Markdown reference and the admitted resource. Strict alternative and summary comparison turns otherwise silent authoring drift into a whole-render failure, and isolated-image promotion intentionally cannot express a diagram inside surrounding phrasing.

## Alternatives considered

A custom fence, directive, comment, MDX element, or parser plugin would put a package-specific language into otherwise portable Markdown. Reading or parsing the referenced SVG would add I/O, trust asset contents, and attempt to recover semantics from a projection. A global registry or resolver callback would make equal source render differently through hidden process state. Promoting every matching inline image would replace meaningful prose structure and make layout depend on presentation-specific heuristics.
