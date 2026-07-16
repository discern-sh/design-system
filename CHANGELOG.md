# Changelog

Releases follow [SemVer](https://semver.org). JSR versions are immutable: a
published version is never edited or replaced, and a bad release is superseded
by a new version (or yanked) rather than rewritten. Before 1.0, minor versions
may still change the public contract; every breaking change is recorded here.

Each release is cut from a green run of the full release gate — formatting,
lint, strict type-checks, package tests, the catalogue build, generated-output
currency, and a publish dry run against the allowlisted artifact — and published
through JSR trusted publishing from CI.

## 0.1.0

The first published version. Extracted from the Discern repository with its
component and token history preserved.

- One `discern` CSS namespace across classes, custom properties, data
  attributes, keyframes, and cascade layers, scoped beneath
  `:where([data-discern-root])`.
- Framework-neutral root, `./manifest`, `./runtime`, `./tokens`, and
  `./theme/discern` exports; React confined to the optional `./react` adapter
  with an 18.3+ peer contract.
- Deterministic selected-runtime emitter: explicit components and/or canonical
  groups, dependency resolution from generated metadata, stable byte-for-byte
  output, and a manifest carrying ownership, token, output, and SHA-256
  integrity facts.
- 54 components across Core, Display, Editorial, Feedback, Forms, Layout,
  Marketing, and Navigation groups, with a local catalogue.
- Semantic light/dark theme roles with the branded blue preset separated from
  the base; consumer themes override public tokens without forking component
  CSS.
- Optional, independently selectable font pack (with SIL OFL licence texts) and
  grain texture; core output copies no assets.
