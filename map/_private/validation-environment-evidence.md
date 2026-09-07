# Borrowed validation environment exercise

Recorded on 2026-09-07 in the owner-designated `jack-test-1-100468` worktree. The source was `d70606af22abc1d4e7260e486ed9cdd986a91f76`; trunk remained `c937080254eec7e4cbdb526b4d44ab73c2a1e30e`. These are environment diagnostics, not landing Proof.

The native discern composition procedure combined a temporary predecessor changing foundation CSS with the committed source. It created separate merge and regeneration commits, ending at `1c815840cc691128bbc6a9277bccb2d196a052dc`. The resulting runtime contained the temporary CSS marker. No source branch or trunk ref moved.

The native execution lifecycle then installed that fully generated candidate and ran the project's declared installation/build preparation and restoration. Catalogue type checking passed in the success case. A deliberate exit 23 supplied the failure case. The cancellation case started a supervised child that emitted `probe-ready`, then received external cancellation; the durable attempt records cancellation and completed return.

| Exercise | Attempt                                | Validation outcome | Return                              |
| -------- | -------------------------------------- | ------------------ | ----------------------------------- |
| success  | `2226cd2b-b802-4815-889b-fa67f18d4f81` | passed             | restored, clean, children quiescent |
| failure  | `c8bd1302-af42-470e-bfe0-d0c1695f30d4` | failed             | restored, clean, children quiescent |
| cancel   | `c0b83b29-1f8e-4e98-9831-0f920faad893` | cancelled          | restored, clean, children quiescent |

The exercise compared restored runtime CSS byte-for-byte with the source build, checked committed example-image and manifest hashes, and verified original branch/head, clean status, unchanged queue entries, unchanged trunk, and settled child processes. Temporary fixture directories were not substituted for this checkout's real dependencies and outputs.

The borrowing exercises used capacity one with lookahead disabled. The same preparation/return commands and ignored-state boundary support the enabled configuration. A separate read-only invocation of discern's live `workCapacity` planner proved that completion concurrency one blocks a non-head speculative candidate, concurrency two admits the next candidate while preserving the head slot, and lookahead one blocks the third position. Completion concurrency and borrowed environment capacity are therefore two; the existing test-stage limit stays one. Simultaneous real authoring/acceptance sessions remain a follow-up usage test, rather than a claim made by these serial exercises.

Initial harness mistakes omitted generated-commit handling and then paired a candidate binding with no publication. The executor preserved the latter detached candidate. Its exact committed contents were saved in a diagnostic bundle, the unpublished harness binding was preserved separately, and native recovery restored the recorded source after reconciliation. No failed diagnostic was promoted to Proof, and no recovery record was cleared to claim success.

The committed preparation test covers phase ordering, execution from outside the checkout root, current-source selection, and failed installation/build propagation. The final complete gate applies separately to the committed configuration and instructions.
