# CLI consumer hardening

One design-system follow-up discovered during the 2026-08-12 audit for Discern's adoption of `@discern-sh/design-system@0.11.0`.

The package release is complete. This is a narrowly bounded consumer-hardening patch before Discern pins the new CLI layer:

- interactive choice lists need a first-class non-selectable group heading so consumers do not encode headings as disabled fake values; and
- Fleet needs an opt-in lossless identity mode so operational branch and worktree names remain exactly copyable.

The implementation brief is [0A — Close the two consumer contract gaps](0a-package-consumer-hardening.md). After it lands, the owner cuts the prepared release through this repository's `release` skill. Publication is not part of the implementation stream.

The dependent Discern programme is stored at `/Users/jack/Sites/discern/project/map/_private/planning/cli-adoption-workstreams/`. Its first consumer stream must wait for the new version to be published on JSR and prove the contracts through external package imports; a local checkout is not sufficient.

No implementation session was launched when this brief was prepared.
