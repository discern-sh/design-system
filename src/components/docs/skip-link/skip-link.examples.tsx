import { SkipLink } from "./skip-link.tsx";

export default function SkipLinkExamples() {
  return (
    <div className="discern-example-stack">
      <p>
        The bypass link below is visually hidden until it receives keyboard
        focus; press Tab from the top of the page to surface it.
      </p>
      <SkipLink href="#skip-link-target" />
      <p id="skip-link-target">Lorem ipsum main content landing point.</p>
    </div>
  );
}
