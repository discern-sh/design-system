import { loadComponentSources } from "../../scripts/generate.ts";

const components = await loadComponentSources();
const pending = components.filter((component) =>
  component.meta.cli === undefined
);
console.log(`DISCERN_METRIC cli_pending ${pending.length}`);
