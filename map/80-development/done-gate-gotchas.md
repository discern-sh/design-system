# Done-gate gotchas

_Non-obvious ways `discern done` fails — each with its fix. The everyday gate procedure lives in [getting-started.md](getting-started.md) and [code-conventions.md](code-conventions.md); this page is the "why did it fail in a way the message didn't explain" reference._

The gate **points an agent here when a stage fails** in a non-obvious way: when a fix/build/check/test stage exits non-zero, the gate prints a pointer to this doc (the path is `[project].gotchas_doc` in `discern.toml`). So the explanation is one step away even for an agent that has never hit the failure.

These are real failure modes, each with its fix. **If you hit a new one, add it here** — that is what keeps this page worth pointing at.

---

## Stack-independent traps

These arise from how discern works (git worktrees, parallel stages, build artifacts, the merge check) and apply on any stack. They are seeded here so the gate has something useful to point at on day one.

### `main` advanced during your session

**Symptom.** `discern done` stops almost immediately — before the fixers, build, checks, or tests run — with a message that your branch does not contain the latest `main`. It does **not** merge for you.

**Cause.** The merge check is the gate's **first** step, fail-fast. While you were working, `main` moved, so your branch is behind it. A branch behind `main` has to update and re-run regardless — the integration changes the tree and discards whatever the gate computed against the pre-integration tree — so the gate refuses up front rather than spending the slow fix/build/check/test on a result you are about to throw away.

**Fix.** Commit your work, then run `discern update` — it brings `main` into your branch and re-materializes the generated agent files + skills in one step. (On a conflict it aborts cleanly and names the conflicting files. Resolve them with `git merge main`, commit the merge, then carry on.) Then run `discern done` again to verify the merged tree. (In the main checkout, not a worktree, this check is a no-op — there is nothing to update into.)

### A check passes alone but fails in the full run

**Symptom.** You run one test (or linter) over the files you changed and it is green, but the same step goes red inside `discern done`.

**Cause.** Shared state or ordering. The gate runs the full suite — often in parallel — so tests that lean on a shared resource (a file, a database row, a global, a fixed port) or that assume they run in a particular order pass in isolation and collide at scale. A targeted run never exercises the collision.

**Fix.** Make each test self-contained: own its fixtures, never assume order, and never reuse a resource another test could touch concurrently. Reproduce by running the full suite (or your stack's parallel mode) rather than a single filter. The bug is in the test's isolation, not in the gate.

### Stale build artifacts

**Symptom.** A check or test fails referencing code or assets that no longer match your source — an old compiled output, a cached bundle, a missing-from-manifest error — even though the source is correct.

**Cause.** A `build` capability produces artifacts that a later `check`/`test` stage reads, and the artifacts on disk are from a previous run (or were half-written while something read them).

**Fix.** Rebuild from clean and re-run. The gate already orders `build` (and `fix`) **before** `check`/`test` so artifacts are complete before anything reads them — so if you are hitting this, you likely ran a step by hand out of order, or a partial build was left behind. Let `discern done` run the stages in order rather than invoking a check directly against stale output.

### A merge pulled in a new dependency

**Symptom.** Right after `git merge main`, the next gate run dies in a check or test stage on a missing module/class/package — something that exists on `main` but is unknown locally.

**Cause.** In an isolated worktree (and often elsewhere), dependencies are not in version control. A merge updates the _lockfile text_ but installs nothing. The new code references a dependency that was never fetched into this checkout.

**Fix.** Reinstall dependencies in this checkout (your stack's `install`/`restore`/`sync` step) **before** re-running the gate. If your toolchain has a generated index, autoloader, or classmap, regenerate it too — a merge that adds a new source path can leave the generated index stale, which some tools report as a silent bootstrap failure (an empty error, an unexpected non-zero exit) rather than a clear "not found".

### A command hangs, then fails with a timeout

**Symptom.** `discern done` sits on a stage with no further output, then — after `[gate].timeout` seconds (default 600) — fails that stage with a diagnostic that the command "timed out … without exiting". The command works fine when you run it by hand.

**Cause.** A gate command never exits. The usual culprit is a **watch-mode test runner** or a **dev server** wired into a capability. Run by hand in your terminal it may pick a single run, but the gate runs it with stdin closed, no TTY, and piped output, where many runners default to _watching_ for file changes and wait forever. The gate exports `CI=1` (with `NO_COLOR` / `TERM=dumb`) to push runners into their single-run form, but one that ignores `CI` still hangs — so the timeout watchdog tree-kills the whole process group and fails the stage rather than waiting indefinitely.

**Fix.** Wire the command in its **single-run form** — the flag or script that runs once and exits, not a `--watch`/interactive mode and not a long-lived server. If the command is _legitimately_ longer than the budget (a large suite), raise `[gate].timeout`; set it to `0` only to disable the bound entirely (not recommended — the gate can then hang again).

### A gate command fails with exit 127 (command not found)

**Symptom.** A capability or check fails immediately with `exit 127` and a `sh: <cmd>: not found` line — a command that runs fine in the main checkout.

**Cause.** A fresh worktree starts with only your tracked files. The tools and dependency directories that put that command on `PATH` — an untracked package `bin` directory, a local tools or cache directory, a per-checkout language environment — do not exist in the new worktree until something creates them, so the shell cannot find the command.

**Fix.** Converge those directories in every worktree with `[worktree.setup].ensure` — commands that run on every setup pass (install dependencies, build the toolchain). One-shot scaffolding that only needs to run at creation goes in `[worktree.setup].steps`. Then the command is on `PATH` wherever the gate runs.

### A failure shows up as exit 0

**Symptom.** You pipe `discern done` into `tee`, `tail`, or another command to capture its output, and it appears to succeed even though a stage clearly failed.

**Cause.** A pipeline reports the **last** command's exit code, not the gate's. The real non-zero status is masked by the pipe.

**Fix.** Run `discern done` bare so its true exit code surfaces. If you must capture output, use a method that preserves the original exit status (for example, redirect to a file rather than piping, or set your shell's `pipefail` option).

### The gate skips a step you expected it to run (scope detection)

**Symptom.** A change you made does not trigger the scope `gate`, preview, or build you expected — for example a docs-only change runs almost nothing.

**Cause.** This is by design. The gate classifies which scopes a change touched (`[scopes]` in `discern.toml`) and skips work that cannot be affected: a change confined to `neutral` paths runs no scope `gate`s and gets no preview. Classification **fails open** — a path matching no rule counts as a real code change, so an unknown path runs _more_ gates, never fewer.

**Fix.** If something was skipped that should not have been, your `[scopes]` globs do not match the paths you changed — widen them. If something ran that you expected to be skipped, the path fell through to the fail-open default; add it to `neutral` (or the right scope) if it genuinely needs no gate.

---

## Project-specific traps

<!-- Add your stack's non-obvious gate failures below. -->

This section is yours to grow. As you build and hit failures the error message alone did not explain, record them here as **symptom + cause + fix** — the same shape as the entries above. Good candidates:

- A tool in one of your `[capabilities]` that fails for a reason its own output does not make clear.
- An ordering constraint specific to your build (an artifact one stage must produce before another reads it).
- A test-isolation footgun unique to your framework or test runner.
- A toolchain step a merge can invalidate (a generated file, a native build, a cache) that needs regenerating before the gate is green.

### `deno fmt` reflows a compiled agent file and fights the instructions check

**Symptom.** The format stage rewrites `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`, then the gate's instructions-currency check reports them stale (or `discern
refresh` immediately rewrites them back) — the two sides loop forever.

**Cause.** Those three files are compiled outputs of `discern refresh` (built-in instructions + `discern/instructions.md`), but this repo's `deno fmt` also formats markdown. If they are not excluded from fmt, the formatter and the compiler each "correct" the other's output.

**Fix.** Keep all three listed in `fmt.exclude` in [`deno.json`](../../deno.json) (they are, since setup). Edit `discern/instructions.md` (which fmt _does_ format), run `discern refresh`, and never hand-edit or format the compiled copies. Any newly added compiled agent file joins the exclude list in the same change.

### Builder shortcut isolation reports that a focused control changed the document

**Symptom.** Browser conformance intermittently fails its first interactive shortcut-isolation target with `focused link Delete shortcut changed the document` and reports `shortcutIsolationChecks: 0`; an unchanged rerun passes.

**Cause.** The preceding placement helper used the existence of any matching Layers label as its completion witness. When the composition already contained a Component with that name, the helper could return before the newly placed layer, canvas, and selection rendered. Shortcut isolation then sampled that in-flight document projection and blamed the subsequent Delete press when the projection settled. A keydown captured during diagnosis still targeted the focused link; the Builder's document-shortcut handler correctly ignored it.

**Fix.** Keep `placeNamedComponent` in [`scripts/conformance/builder/discovery.ts`](../../scripts/conformance/builder/discovery.ts) waiting for the exact matching Layers population to grow by one. Shortcut isolation drains deferred frames before taking its document witness and presses through the target Locator so the tested event is owned by that control. Do not replace either precondition with an existence wait or a fixed delay.

### Builder shortcut isolation reports a zoomed target outside the edit layer

**Symptom.** Browser conformance intermittently reports `zoomed target was outside the scrolled edit layer` or `edit-mode frame scrolling also moved the outer canvas` during interactive shortcut isolation; an unchanged rerun passes.

**Cause.** Scrolling the inner preview moves the selected node's absolute editing overlay upward. That can shrink the outer canvas's legal scroll range, so the browser clamps its existing scroll offset even though the wheel never propagated; comparing raw offsets misdiagnoses the required clamp as scroll leakage. Playwright's mouse wheel also returns before the forwarded frame scroll necessarily settles, so immediate target geometry can still sit beneath the sticky preview-status chrome rather than the edit layer.

**Fix.** Compare the resulting outer offset with `clampedScrollPosition(previous, newMaximum)` rather than with the raw previous offset, then keep wheel-driven pointer geometry behind `waitForStableWindowScroll`. Both authorities live in [`scripts/browser-conformance-support.ts`](../../scripts/browser-conformance-support.ts). Tracked-TypeScript architecture tests reject future wheel witnesses that omit post-layout clamping or sample synthetic-click geometry before the inner scroll settles.

### The `css_density` standard measures a stale `dist/discern.css`

**Symptom.** The `css_density` number does not move when you expected it to (or a standalone `discern standards` run reports a size that ignores your change).

**Cause.** The measurement reads `dist/discern.css` and only builds when the file is _missing_, not when it is stale. Inside `discern done` this is always fresh — the build stage runs first — but a standalone `discern standards` after source edits measures whatever the last build wrote.

**Fix.** Trust the number in `discern done`. For a standalone measurement, run `deno task build` first (or delete `dist/discern.css` and let the standard's run rebuild).

### A conformance role target with `name` misses because hidden text joins the computed name

**Symptom.** A conformance scenario targeting `{ role: "...", name: "..." }` fails with `Expected one target but found 0`, even though the element visibly exists and its accessible name looks like an exact match — typically when the element contains aria-hidden decoration (a sigil, an icon, a decorative Avatar) beside its visible text.

**Cause.** The runner resolves role targets with Playwright's `getByRole(role, { name, exact: true, includeHidden: true })` (see `targetLocator` in [`conformance.ts`](../../scripts/conformance.ts)). Playwright's `includeHidden` option also feeds its accessible-name computation, so aria-hidden descendants join the computed name — the name stops matching exactly even though real assistive technology would exclude them. An explicit `aria-label` is immune (it wins over content), which is why label-based scenarios like Tag's pass.

**Fix.** For elements whose accessible name comes from content next to hidden decoration, either target by a unique `selector` and pin the decoration's `aria-hidden="true"` with an attribute expectation, or give the scenario's role target the full text including the hidden parts. Also remember `exactlyOne`: any target that matches twice in the example canvas fails, so scope selectors with an attribute (`[aria-label="…"]`, `[href="…"]`) when an example renders several instances.

### An axe contrast scan combines colours from two themes

**Symptom.** Browser conformance intermittently reports `color-contrast` on text whose computed foreground and background have ample contrast. The failure can name the same target in light and dark runs, while an isolated rerun passes.

**Cause.** Axe can begin after an in-page theme attribute changes but before two browser paints have invalidated its appearance caches. It then evaluates the foreground retained from the previous theme against the current background. Waiting for the theme attribute or fonts alone does not establish a painted-frame boundary.

**Fix.** Route every axe scan through `scanBrowserAccessibility` in [`scripts/browser-conformance-support.ts`](../../scripts/browser-conformance-support.ts). That authority waits for two painted frames before analysis; the architecture test rejects any current or future conformance script that imports `@axe-core/playwright` directly. Do not weaken contrast rules or patch the reported element's valid Tokens.

### A computed-style loop repeats its first probe value

**Symptom.** A browser check passes in a default page but reports every sampled custom property as the first property's value in the full reduced-motion conformance context. Colour and geometry samples can both fail this way even though the authored CSS is correct.

**Cause.** The check mutates one probe element's inline style and immediately reads its computed style or layout again inside the same browser task. Chromium can retain the first style resolution across those synchronous mutations under the full conformance context.

**Fix.** Give every sampled fact its own immutable probe: set each probe's style once, append all probes, read each result, then remove them. Do not add delays, retries, or tolerances; those leave measurements coupled through mutable browser state.

### The main checkout's `node_modules` lags a landed dependency

**Symptom.** In the **main checkout**, `discern done` fails its typecheck stage with `error: Could not resolve "<package>", but found it in a package.json. Deno
expects the node_modules/ directory to be up to date. Did you forget to run
'deno install'?` — right after work landed on `main`, even though the same gate was green in the worktree that built that work.

**Cause.** Worktrees converge dependencies on every pass — `[worktree.setup].ensure` runs `deno install --frozen` at creation, on session-start re-entry, and after `discern update`. The main checkout has no such pass: landing a branch that added an npm dependency fast-forwards `main` without installing anything, so the main checkout's `node_modules/` no longer matches the lockfile. This is the main-checkout variant of "A merge pulled in a new dependency" above.

**Fix.** Run `deno install --frozen` in the main checkout, then re-run the gate. Any time `main` moves under you (a landed branch, a pull), reinstall before gating.

### A tall example refuses to capture

**Symptom.** A new or grown example fails its capture because its document renders past the versioned capture viewport. Nothing is wrong with the example, and it renders correctly in the Catalogue.

**Cause.** The capture viewport is deliberately taller than the tallest example. A `fullPage` screenshot of a document larger than the viewport permanently changes how that Chromium page rasterizes text, for every later capture it takes, and navigation does not clear it — so a single tall example would silently move the pixels of whichever examples followed it. Because the run reuses one page, the viewport must stay clear of every document, and `validateComponentExampleCaptureFitsViewport` refuses rather than let that happen.

**Fix.** Decide first whether the example should be that tall — a capture is discovery imagery, not a page, and trimming its content is usually the better answer. If the height is genuine, raise `viewport.height` in [`contract.ts`](../../catalogue/example-images/contract.ts) past it with room to spare, bump the capture `version`, and recapture. Expect top-layer postures such as Dialog and Search palette to change: they position against the viewport, not the document, so they move when it does. `tests/component_example_images_test.ts` proves the remaining headroom from committed image heights, so it will fail before the browser does when a committed image gets close.

### A role lookup anchored at the start of a name misses a disclosure button

**Symptom.** Browser conformance times out on `getByRole("button", { name: /^Axes/ })` (or any `^`-anchored name) for the Appearance panel's Tint and Axes disclosures, even though the button visibly reads "Axes …" and `ariaSnapshot()` shows it present.

**Cause.** The disclosure buttons draw their caret with a `::before` pseudo-element whose `content` is a real glyph. Accessible-name computation includes generated content, so the computed name is `▸ Axes default · …`; an anchored regex never matches, while an unanchored one does.

**Fix.** Match names by substring or an unanchored regex for controls that carry a `::before` or `::after` glyph, and keep the shared helpers in [`scripts/conformance/catalogue/support.ts`](../../scripts/conformance/catalogue/support.ts) as the one place that spells those lookups. Do not move the caret into the DOM to satisfy a locator; the snapshot is the truth to test against.
