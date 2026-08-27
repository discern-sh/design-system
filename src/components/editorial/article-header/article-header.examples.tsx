import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Badge } from "../../display/badge/badge.tsx";
import meta, { componentExampleVocabulary } from "./article-header.meta.ts";
import { ArticleHeader } from "./article-header.tsx";

export default function ArticleHeaderExamples() {
  return (
    <ArticleHeader
      eyebrow={<Badge tone="accent">Field note · Issue 08</Badge>}
      title={<>A neighbourhood garden through the seasons.</>}
      standfirst={
        <p>
          An illustrated account of how planting, weather, and shared care shape
          one small green space over a year.
        </p>
      }
      authors={[{
        name: "Morgan Lee",
        role: "Contributing editor",
        initials: "ML",
      }]}
      meta={["12 min read", "Updated 14 July", "Field notes"]}
      actions={<Button variant="secondary" size="sm">Save article</Button>}
      surface="accent"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: ArticleHeaderExamples }],
);
