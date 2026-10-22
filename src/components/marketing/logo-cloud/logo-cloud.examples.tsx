import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./logo-cloud.meta.ts";
import { LogoCloud } from "./logo-cloud.tsx";

const triangleMask =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 3 29 28H3Z' fill='black'/%3E%3C/svg%3E")`;

const outlineMarks = [
  <circle key="circle" cx="12" cy="12" r="8" />,
  <rect key="square" x="5" y="5" width="14" height="14" rx="2" />,
  <path key="triangle" d="M12 4.5 20 19H4Z" />,
  <path key="diamond" d="M12 3.5 20.5 12 12 20.5 3.5 12Z" />,
];

function OutlineMark({ index }: { readonly index: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {outlineMarks[index]}
    </svg>
  );
}

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
        { name: "Provider one", mark: <OutlineMark index={0} /> },
        { name: "Provider two", mark: <OutlineMark index={1} /> },
        { name: "Provider three", mark: <OutlineMark index={2} /> },
        { name: "Provider four", mark: <OutlineMark index={3} /> },
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
