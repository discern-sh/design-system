import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./list.meta.ts";
import { List } from "./list.tsx";

function NestedListExample() {
  return (
    <List
      items={[
        { content: <>Start with the strongest available evidence.</> },
        {
          content: <>Keep supporting detail close to the claim.</>,
          blocks: [
            <p key="continuation">
              A continuation remains a separate paragraph inside its item.
            </p>,
            <List
              key="nested"
              kind="ordered"
              items={[
                { content: <>Name the observation.</> },
                { content: <>Record the constraint.</> },
              ]}
            />,
          ],
        },
      ]}
    />
  );
}

function TaskListExample() {
  return (
    <List
      kind="task"
      spacing="loose"
      items={[
        { content: <>Reviewed source material</>, checked: true },
        { content: <>Verify the final frame</>, checked: false },
        { content: <>A contextual note without task state</> },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: NestedListExample },
    { id: "task-mixed", Example: TaskListExample },
  ],
);

export default function ListExamples() {
  return (
    <div className="discern-example-stack">
      <NestedListExample />
      <TaskListExample />
    </div>
  );
}
