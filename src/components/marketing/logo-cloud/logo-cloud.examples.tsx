import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./logo-cloud.meta.ts";
import { LogoCloud } from "./logo-cloud.tsx";

const triangleMask =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 3 29 28H3Z' fill='black'/%3E%3C/svg%3E")`;

function ProviderMark({ hue }: { readonly hue: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 29 28H3Z" fill={hue} />
    </svg>
  );
}

function GridLogoCloudState() {
  return (
    <LogoCloud
      label="Example organisations"
      items={[
        { name: "Provider one", mark: "◇" },
        { name: "Provider two", mark: "✦" },
        { name: "Provider three", mark: "○" },
        { name: "Provider four", mark: "△" },
      ]}
    />
  );
}

function StripLogoCloudState() {
  return (
    <LogoCloud
      label="Available across example providers"
      items={[
        {
          name: "Provider one",
          mark: <ProviderMark hue="oklch(58% 0.19 264)" />,
          markMask: triangleMask,
        },
        {
          name: "Provider two",
          mark: <ProviderMark hue="oklch(65% 0.16 152)" />,
          markMask: triangleMask,
        },
        {
          name: "Provider three",
          mark: <ProviderMark hue="oklch(67% 0.16 35)" />,
          markMask: triangleMask,
        },
        {
          name: "Provider four",
          mark: <ProviderMark hue="oklch(62% 0.18 316)" />,
          markMask: triangleMask,
        },
      ]}
      variant="strip"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "grid", Example: GridLogoCloudState },
    { id: "strip", Example: StripLogoCloudState },
  ],
);

export default function LogoCloudExamples() {
  return (
    <div className="discern-example-stack">
      <GridLogoCloudState />
      <StripLogoCloudState />
    </div>
  );
}
