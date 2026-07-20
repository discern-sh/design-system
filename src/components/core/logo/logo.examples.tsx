import { Logo } from "./logo.tsx";

export default function LogoExamples() {
  return (
    <div className="discern-example-row discern-example-row--large">
      <Logo label="Split triangle">◮</Logo>
      <Logo label="Northstar" treatment="tile" shape="square">N</Logo>
      <Logo label="Field notes" size="lg">
        <svg viewBox="0 0 112 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M0 2h18v20H0zM25 2h87v5H25zm0 8h66v5H25zm0 8h78v4H25z"
          />
        </svg>
      </Logo>
    </div>
  );
}
