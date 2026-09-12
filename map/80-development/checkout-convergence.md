# Checkout convergence

Each task stays in its assigned worktree through implementation, review, Proof, and landing. The project keeps that checkout usable for its tracked source, and visible work completes review before the final gate.

## Make the tracked source usable

[`[repository].ensure`](../../discern.toml) runs [`discern/scripts/prepare-checkout`](../../discern/scripts/prepare-checkout) on worktree passes and after a landing. The command installs dependencies from the frozen lockfile and builds the current checkout. It may replace ignored dependency and runtime outputs; committed Catalogue images and their manifest remain source artifacts and are verified by the gate.

[`checkout_preparation_test.ts`](../../tests/checkout_preparation_test.ts) verifies current-source selection, invocation outside the repository root, phase order, and failure propagation. Change the command and this test together.

## Review visible changes

Run the Catalogue on the worktree's deterministic `discern identity --port` port and complete the required visual review there. Stop preview and watch processes before the final `discern done`, and keep them stopped through `discern accept`; a landing may remove the worktree. Browser conformance owns and stops its ephemeral server and automation browser within the gate run.

## Finish and land

Run `discern prepare`, inspect its changes, and commit the intended tree. Run `discern done` on clean committed HEAD. If `main` advances after the Proof, run `discern update`, `discern done`, then `discern accept`.

`discern accept` records the submission and checks landing authority. A task grant recorded at the desk covers later green commits the assigned agent submits for that task. Without a matching grant or the owner's consent in conversation, acceptance records the submission and refuses the landing. A successful landing removes the worktree, its resources, and its branch when the branch contains nothing beyond the landed submission.
