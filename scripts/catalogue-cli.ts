import { detectTerminalCapabilities } from "../src/cli/capabilities.ts";
import type {
  CliComponentRegistryEntry,
  CliExample,
} from "../src/cli/contracts.ts";
import { cliComponentRegistry } from "../src/generated/cli-registry.ts";

const slug = Deno.args[0];
if (slug === undefined || slug === "") {
  throw new TypeError("Usage: deno task catalogue:cli <component-slug>");
}

const registry = cliComponentRegistry as Readonly<
  Record<string, CliComponentRegistryEntry>
>;
const entry = registry[slug];
if (entry === undefined) {
  throw new TypeError(`Unknown component ${JSON.stringify(slug)}`);
}
if (entry.stance === "pending") {
  throw new TypeError(`${slug} has no declared CLI stance`);
}
if (entry.stance === "exempt") {
  throw new TypeError(`${slug} is exempt from CLI rendering: ${entry.reason}`);
}

const isTty = Deno.stdout.isTerminal();
const columns = isTty ? Deno.consoleSize().columns : undefined;
const capabilities = detectTerminalCapabilities({
  env: Deno.env.toObject(),
  isTty,
  ...(columns === undefined ? {} : { columns }),
});
const registryModule = new URL(
  "../src/generated/cli-registry.ts",
  import.meta.url,
);
const loaded = await import(
  new URL(entry.modulePath, registryModule).href
) as unknown;
if (typeof loaded !== "object" || loaded === null) {
  throw new TypeError(`${slug} CLI module has no exports`);
}
const module = loaded as Readonly<Record<string, unknown>>;
if (typeof module.default !== "function") {
  throw new TypeError(`${slug} CLI module has no default renderer`);
}
if (!Array.isArray(module.cliExamples)) {
  throw new TypeError(`${slug} CLI module has no cliExamples array`);
}
const render = module.default as (
  props: unknown,
  capabilities: ReturnType<typeof detectTerminalCapabilities>,
) => unknown;
for (const candidate of module.cliExamples) {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError(`${slug} has an invalid CLI example`);
  }
  const example = candidate as CliExample<unknown>;
  if (typeof example.name !== "string" || example.name === "") {
    throw new TypeError(`${slug} has an unnamed CLI example`);
  }
  const frame = render(example.props, capabilities);
  if (typeof frame !== "string") {
    throw new TypeError(`${slug} renderer returned a non-string frame`);
  }
  console.log(`# ${slug} · ${example.name}`);
  console.log(frame);
}
