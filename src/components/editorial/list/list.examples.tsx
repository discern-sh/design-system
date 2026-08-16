import { List } from "./list.tsx";

export default function ListExamples() {
  return (
    <div>
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
      <List
        kind="task"
        spacing="loose"
        items={[
          { content: <>Reviewed source material</>, checked: true },
          { content: <>Verify the final frame</>, checked: false },
          { content: <>A contextual note without task state</> },
        ]}
      />
    </div>
  );
}
