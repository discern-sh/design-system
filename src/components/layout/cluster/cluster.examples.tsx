import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./cluster.meta.ts";
import { Cluster } from "./cluster.tsx";

function DefaultClusterState() {
  return (
    <Cluster gap={3}>
      <Button>Save</Button>
      <Button variant="secondary">Preview</Button>
      <Button variant="ghost">Cancel</Button>
    </Cluster>
  );
}

function CentredClusterState() {
  return (
    <Cluster gap={3} justify="center">
      <Button variant="secondary">One</Button>
      <Button variant="secondary">Two</Button>
      <Button variant="secondary">Three</Button>
    </Cluster>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: DefaultClusterState,
      capture: {
        selectors: [".discern-cluster > .discern-button"],
        framing: {
          mode: "allocation",
          reason:
            "The ghost action's interactive allocation completes the primary, secondary, and ghost comparison.",
        },
      },
    },
    { id: "centred", Example: CentredClusterState },
  ],
);

export default function ClusterExamples() {
  return <DefaultClusterState />;
}
