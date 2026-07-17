# Changelog

Releases follow [SemVer](https://semver.org). JSR versions are immutable: a
published version is never edited or replaced, and a bad release is superseded
by a new version (or yanked) rather than rewritten. Before 1.0, minor versions
may still change the public contract; every breaking change is recorded here.

Each release is cut from a green run of the full release gate — formatting,
lint, strict type-checks, package tests, the catalogue build, generated-output
currency, and a publish dry run against the allowlisted artifact — and published
through JSR trusted publishing from CI.

## Unreleased

- Add the Navigation-group Breadcrumbs component: a labelled ordered hierarchy
  with linked ancestors, one explicit current page, and narrow-view overflow.
- Add catalogue-driven browser conformance: every component example auto-enrols
  in light/dark accessibility scans and review sheets, with co-located
  interaction scenarios plus reduced-motion and forced-colour checks.
- Strengthen tertiary-ink contrast across semantic surfaces, add the
  `--discern-color-warning-deep` text role, and correct definition-list and
  figure-example semantics uncovered by the browser gate.

## 0.2.0

- Set up discern, ensuring the quality of the code in its own design system.

## 0.1.1

- Every entrypoint now carries a module doc and all public symbols carry symbol
  documentation, generated into the JSR reference docs. A release test fails if
  an undocumented export appears.
- The runtime emitter writes through `node:fs/promises` instead of Deno file
  APIs, so selected-runtime emission also works on Node.js with byte-identical
  output. Under Deno the emitter now needs read as well as write permission for
  its output directory.

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
