# 2F — Improve source listing copy and wrapping

Readers can identify, copy, and comfortably inspect source code without losing exact source text or stable line references.

**Proposal coverage:** F3. **Worktree name:** `refine-2f`. **Relative size:** S–M. **Programme:** design-polish.

Other streams are in flight. You own `2F` only; do not launch, dispatch, or supervise the sibling briefs.

## Orient, satisfy prerequisites, then re-root

Start with `discern_status` at `/Users/jack/Sites/discern-design-system`. If this exact effort already has a worktree, continue at its recorded path; never create a second one or adopt a sibling's idle checkout.

- 1B: Make published copy actions work in static output. Verify `map/_private/planning/design-polish/_done/1b-static-copy-contract.md` on main **and** the delivered contract described in that brief.

This is an independently landed workstream, not a below-trunk stack. The numbers in this programme are dependency tiers: only the prerequisites above block you. Do not wait for unrelated lower-key briefs. These prompts are ready for dispatch after their named prerequisites land. If dispatched early, use the `discern-await-the-fleet` skill and the predecessor's **exact returned identity and branch**, captured by the dispatching session, to await its landing. Never guess a suffixed branch from `refine-1a` or another requested name. If that identity is missing or ambiguous, report the missing dispatch record and do not start dependent implementation.

Once ready, call `discern_start` from the main checkout with the literal name `refine-2f`, then re-root all reads, edits, commands, and discern calls to its returned absolute path. Follow the await tool's start/update hint if applicable. Read the worktree's `AGENTS.md`, `map/00-orientation/design-principles.md`, and this brief there before source work. Verify every anchor against the live tree; 1C intentionally moves some Catalogue anchors.

## Background and outcome

CodeListing already has filename/language context, highlighted lines, line numbers, captions, and a focusable scrolling body. Extend those strengths using the static copy contract from 1B.

The owner completed A1–A5 on main, with baseline commit `a1bd80f3886e`: shared control sizes, rhythm/type roles, quieter elevation, tonal hierarchy, and composed Foundation review. Preserve that work and judge current behaviour before repeating a correction. This repository is the public library and its Catalogue; the discern tool and sibling consumer projects are outside this brief.

## Read the authorities

- `src/components/editorial/code-listing/`
- `src/components/editorial/code-block/`
- `src/components/docs/copy-button/`
- `tests/code_block_test.tsx`
- `tests/cli/code_block_test.ts`
- `tests/markdown_code_block_browser_test.tsx`

## Deliverables

- **F3.** Compose the public CopyButton with the raw source authority, and offer optional wrapping where it improves inspection. Preserve horizontal scrolling as an explicit option. Keep filename, language, caption, line numbering, and highlight semantics readable at narrow widths. Decide whether wrap is an authored option, a native control, or justified selected behaviour; static consumers must receive what the docs promise.

- **Source fidelity.** Separate visual gutters, wrapped continuations, decorative chrome, and copy feedback from actual source. Copying must preserve exact whitespace and newlines and must never include line numbers. Wrapping does not change logical line identity or the copied string.

- **Compatibility.** Keep standard and showcase variants on the same semantic implementation. Document the optional API and any effect on CLI rendering; a browser-only viewing preference must not silently alter terminal source bytes.

## Ownership and exclusions

You own:

- Code listing and Code block folders, including their local styles/examples/metadata.
- Focused code-listing tests and existing code-block/CLI expectations where the public behaviour changes.

Out of scope: CopyButton behaviour internals, article-wide rhythm/print, syntax-highlighter replacement, editor features, and standalone code-download/file-management flows. All proposals deferred to `discern/TODO.md` stay deferred. Do not opportunistically implement a sibling brief.

Required companion edits are allocated to this stream: its own Unreleased changelog bullet for public contract/byte changes; its own map leaf and exact index link when needed; its own brief and programme-index row; exact enrollments in existing guards for paths/capabilities already declared above; and generated output from the owning commands. Preserve sibling entries. These routine enrollments, regenerations, conflict resolutions, and moved-link repairs need no second permission exchange. Keep new shared behaviour and contract decisions with their assigned owner; the deliverables in this brief are already authorised.

Authored feature files stay with their owner. Shared derived files and the narrow companion entries are an explicit integration exception, not disjoint authored work: `src/generated/`, `scripts/generated/`, and the author-skill evals use the configured generator/merge regeneration. The tracked `catalogue/generated/example-images-manifest.ts` and PNGs also come only from the image command and are not covered by that merge driver. Never hand-merge their facts or pixels. Coordinate the short landing turn, call `discern_update`, follow its conflict recovery, and regenerate from the complete merged authored tree. If an image conflict blocks importing its manifest, recover a parseable generator input through the printed remedy and regenerate before committing; neither side alone is a finished resolution.

## Implementation constraints

- Keep namespaced/scoped output, deterministic selected emission, React-free neutral/CLI graphs, and the build-time React contract. Native browser semantics are the default; selected behaviour must be explicit and justified.
- Use existing Appearance, control-size, type, spacing, motion, and semantic roles. Themes move tokens; do not retune the shared foundations under a local polish brief. Keep the interface-text floor, density target floor, status witnesses, forced-colour focus, and reduced-motion meaning.
- Preserve public names and canonical example identities unless an explicit, documented contract change is necessary. Generic examples belong here; product claims, routes, and bespoke consumer artwork do not.
- Use `discern-cure-a-bug` for a demonstrated defect and leave a practical regression guard at the authority that owns its class. Use `add-a-component` for new Components and `discern-write-adr` for surprising/hard-to-reverse decisions.
- Do not hand-edit generated registries, manifests, or images. Run `deno task codegen` for affected authored package facts and `deno task catalogue:images --update` when canonical Web output changes. Reuse the existing review instrument rather than inventing a screenshot gate.
- Never loosen a standard or assert an unmet checkpoint is met. Return a measured, concrete owner decision if the finished minimal design cannot satisfy a limit.

## Verification and definition of done

- A real static page copies multiline source exactly, including tabs, leading/trailing whitespace, long tokens, Unicode, and empty source.
- Wrap/scroll states preserve logical numbering, highlighted line identity, keyboard access, and focus outlines.
- Existing filename/language/caption and inverse showcase treatment remain legible in both themes.

- The semantic bar is the goal at the top of this brief: demonstrate the real user task, not only isolated snapshots or passing selectors. Record what changed, why, tested widths/states, and any remaining limitation.
- Extend focused tests in the allocated area and authored conformance/postures where meaningful. Run direct tests through `discern queue -- <command>`; the repository admits one complete test run at a time. Avoid a redundant full test preflight before `discern_done`.
- After all edits and any integration update, run `discern_prepare`, commit logical changes atomically, then run `discern_done` on the clean final HEAD. Re-run on a changed HEAD; an earlier Proof does not cover new edits.
- Leave the Catalogue running at the worktree's deterministic `discern identity --port` port and report exact localhost URLs. Preview evidence: Code listing standard/showcase detail examples, plus an emitted static copy-and-wrap fixture. Include `?surface=cli#component-<slug>` links for changed CLI renderers, and the live playground when an interactive adapter flow changes.
- **Landing rule chosen by the owner:** use discern grants. After green `discern_done`, call `discern_accept` without inventing confirmation. A recorded desk grant may land this worktree; without a grant the verb refuses, so report the exact Proof, branch, worktree, preview, and any owner decision, then stop. Never push or publish. A grant does not waive standards or an unmet checkpoint variance.
- Return the branch/worktree identity for an adversarial review against this brief. The planning agent will inspect the diff and reproduce the important journeys; gate success alone is not a visual review.
- In the final implementation commit, before the final prepare → commit → done sequence, move `map/_private/planning/design-polish/2f-code-listing-copy-and-wrap.md` to `map/_private/planning/design-polish/_done/2f-code-listing-copy-and-wrap.md`, repair any moved relative links, and update **only this stream's row** in the programme README to the `_done/` path and completed state, preserving every sibling row.
