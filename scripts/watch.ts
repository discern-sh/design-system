import server from "./serve.ts";
import { buildDesignSystem } from "./build.ts";

// Runs under `deno serve --watch`: each source change restarts the module,
// so the rebuild happens here at the top level before serving resumes.
try {
  const summary = await buildDesignSystem();
  console.log(
    `Rebuilt ${summary.components} components and ${summary.tokens} tokens; watching for changes.`,
  );
} catch (error) {
  console.error("Build failed — serving the previous output:");
  console.error(error);
}

export default server;
