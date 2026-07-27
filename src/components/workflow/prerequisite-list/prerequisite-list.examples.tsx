import { PrerequisiteList } from "./prerequisite-list.tsx";

export default function PrerequisiteListExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <PrerequisiteList
        items={[
          {
            requirement: "A current backup exists outside the source.",
            state: "satisfied",
            detail: "Verified by listing its contents.",
          },
          {
            requirement: "The destination path is empty.",
            state: "unresolved",
            detail: "Inspect it before starting the restore.",
          },
          {
            requirement: "The current user can read the source.",
            state: "satisfied",
          },
        ]}
      />
    </div>
  );
}
