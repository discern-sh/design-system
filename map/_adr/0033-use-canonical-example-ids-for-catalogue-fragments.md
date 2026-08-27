# ADR 0033: Use canonical example IDs for Catalogue fragments

**Status**: accepted

## Context

Component examples used to have two unrelated identities. Browser fragments came from optional `catalogueStates` names or one synthetic `default`, while terminal fragments came from renderer fixture names. Terminal names often described an implementation or capability frame rather than the semantic posture a reader was viewing; some synthetic browser defaults represented a catch-all card that the canonical vocabulary now splits into bounded examples. Making Web and CLI examples one contract therefore changes both kinds of fragment suffix.

No repository-owned link targets the replaced synthetic defaults or individual legacy terminal fixture fragments. The one owned Component example deep link names Command's explicit `overflow` example, which survives unchanged. Preserving every other old name would require a manually maintained alias table across the whole Component population, beside the new per-Component vocabulary that is meant to be the sole authority.

## Decision

Web and CLI example fragments use the Component's canonical example ID. Every explicit authored Web ID survives unchanged. A synthetic `default` survives when it still denotes a representative baseline; when the old catch-all split has no honest single baseline, semantic IDs replace it. Old terminal fixture names that do not express the canonical semantic posture receive no blanket alias. This migration is a deliberate one-time fragment-contract break recorded in the changelog.

Known, contract-owned legacy links still receive bounded upgrades at the Catalogue route boundary. A future canonical example rename is a fragment contract change and must either upgrade the specific known links or state its compatibility break explicitly. The project does not accumulate an unbounded history of aliases and does not create a central hand-maintained example registry.

## Consequences

Every rendered example now has one address on either surface, and generated browser and terminal projections cannot disagree about its identity. Deterministic capture tooling can key its output by Component slug and canonical example ID.

Bookmarks to pre-migration terminal fixture fragments whose names changed, or to a replaced synthetic browser `default`, no longer resolve to an individual example. This cost is bounded to the contract transition; subsequent canonical IDs are stable public Catalogue vocabulary.

## Alternatives considered

Keeping terminal fixture names would preserve links by preserving the drift: many names describe capability matrices or unrelated scenarios. Aliasing all historical names would make a second authority permanent and require future Components to enrol in both systems. Surface-specific fragment schemes would make switching surfaces lose example identity, defeating the shared contract.
