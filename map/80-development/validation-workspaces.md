# Validation workspaces

The completion queue may borrow a released effort checkout to validate an immutable combination before it lands. Each agent keeps its assigned worktree. Completion and environment capacity leave room for the next candidate while the queue head retains a slot; the test-stage queue separately limits browser-heavy execution. A preview or watcher must stop before that checkout is released: a watcher can rebuild files during candidate installation, and a preview could display the temporary combination.

## Review and release

Provide a Catalogue preview for visible changes while the owner reviews them, before final completion. After approval, stop the effort's preview/watch processes and run `discern done` on clean final HEAD. Follow its next action for acceptance; a recorded grant or conversation consent still governs landing. There is no post-acceptance preview requirement.

Stop preview/watch processes before every gate run: the gate itself can install a temporary candidate. If review requires a green gate first, run `discern done --retain-checkout` with those processes stopped, then restart the preview after it returns. After approval, stop them again and use `discern done --rerun` to complete with checkout release. Plain `done` can reuse a retained green Proof without releasing the checkout; the explicit rerun costs another gate. Previewing before final completion avoids that extra run.

## Preparation and return

[`discern.toml`](../../discern.toml) declares the execution environment and its capacity. Ordinary checkout setup, candidate preparation, and source restoration share [`prepare-checkout`](../../discern/scripts/prepare-checkout). It installs dependencies from the current frozen lockfile before building. A failure in either phase remains a failure.

The engine restores Git state; the project procedure reinstalls and rebuilds for that restored source. The build replaces its owned runtime output. The environment declaration permits changes to the named ignored caches and build outputs; it grants no permission to remove unrelated files. `catalogue/generated/` also contains committed example images and their manifest. Those remain source artifacts, verified by the gate, and must survive preparation and return.

Browser conformance owns an ephemeral server and automation browser for its run. A managed automation browser must be installed for the locked Playwright version; `DISCERN_CHROME_PATH` is an explicit alternative. Environment eligibility does not substitute missing browser prerequisites or permit use of a person's browser profile.

A failed or interrupted return leaves recovery state. Follow discern's recorded recovery action before reusing the checkout. Do not repair it by deleting unfamiliar files or resetting the branch.

## Verification

[`checkout_preparation_test.ts`](../../tests/checkout_preparation_test.ts) exercises both preparation phases, return to a different source, invocation outside the root, and failure propagation. Native candidate installation and restoration must also be exercised when changing the environment procedures or their mutable-state boundary. Use the real build, verify the committed image inventory, check branch/head/index and source output after return, and exercise failure or cancellation without changing trunk. Complete gate evidence remains required for the final committed change.
