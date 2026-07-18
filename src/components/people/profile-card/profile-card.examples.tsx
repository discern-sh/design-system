import { ProfileCard } from "./profile-card.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23d9d2c4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%236b6151'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%236b6151'/%3E%3C/svg%3E";

export default function ProfileCardExamples() {
  return (
    <div className="discern-example-stack">
      <div className="discern-example-grid">
        <ProfileCard
          name="Ada Osei"
          detail="Research"
          bio="Runs the field programme and turns interview transcripts into the questions the roadmap has to answer."
          src={portrait}
          links={
            <>
              <a href="#ada-notes">Field notes</a>
              <a href="#ada-contact">Contact</a>
            </>
          }
        />
        <ProfileCard
          name="Tomás Vega"
          detail="Platform"
          bio="Keeps the build reproducible and the release path boring, which is exactly how release paths should feel."
          links={
            <>
              <a href="#tomas-writing">Writing</a>
              <a href="#tomas-contact">Contact</a>
            </>
          }
        />
      </div>
      <ProfileCard
        layout="landscape"
        name="June Park"
        detail="Editor at large"
        bio="Edits every word the team publishes, and a few it wisely does not."
        links={<a href="#june-desk">From the desk</a>}
      />
    </div>
  );
}
