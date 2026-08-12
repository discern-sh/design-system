import type { CatalogueExampleState } from "../../../../styleguide/conformance.ts";
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
      label="Trusted by teams doing careful work"
      items={[
        { name: "Northstar", mark: "◇" },
        { name: "Fieldwork", mark: "✦" },
        { name: "Commonroom", mark: "○" },
        { name: "Atlas", mark: "△" },
      ]}
    />
  );
}

function StripLogoCloudState() {
  return (
    <LogoCloud
      label="One shared practice across the tools you use"
      items={[
        {
          name: "Northstar",
          mark: <ProviderMark hue="oklch(58% 0.19 264)" />,
          markMask: triangleMask,
        },
        {
          name: "Fieldwork",
          mark: <ProviderMark hue="oklch(65% 0.16 152)" />,
          markMask: triangleMask,
        },
        {
          name: "Commonroom",
          mark: <ProviderMark hue="oklch(67% 0.16 35)" />,
          markMask: triangleMask,
        },
        {
          name: "Atlas",
          mark: <ProviderMark hue="oklch(62% 0.18 316)" />,
          markMask: triangleMask,
        },
      ]}
      variant="strip"
    />
  );
}

export const catalogueStates = [
  { name: "grid", label: "Trust grid", Example: GridLogoCloudState },
  { name: "strip", label: "Provider strip", Example: StripLogoCloudState },
] satisfies readonly CatalogueExampleState[];

export default function LogoCloudExamples() {
  return (
    <div className="discern-example-stack">
      <GridLogoCloudState />
      <StripLogoCloudState />
    </div>
  );
}
