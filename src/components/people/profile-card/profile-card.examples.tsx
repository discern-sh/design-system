import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./profile-card.meta.ts";
import { ProfileCard } from "./profile-card.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23d9d2c4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%236b6151'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%236b6151'/%3E%3C/svg%3E";

function PortraitLayoutExample() {
  return (
    <ProfileCard
      name="Ada Osei"
      detail="Research"
      bio="Turns field evidence into clear research questions."
      src={portrait}
      links={<a href="#field-notes">Field notes</a>}
    />
  );
}

function LandscapeLayoutExample() {
  return (
    <ProfileCard
      layout="landscape"
      name="June Park"
      detail="Editor at large"
      bio="Edits each guide until the next action is clear."
      links={<a href="#from-the-desk">From the desk</a>}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: PortraitLayoutExample },
    { id: "landscape", Example: LandscapeLayoutExample },
  ],
);

export default function ProfileCardExamples() {
  return (
    <div className="discern-example-grid">
      <PortraitLayoutExample />
      <LandscapeLayoutExample />
    </div>
  );
}
