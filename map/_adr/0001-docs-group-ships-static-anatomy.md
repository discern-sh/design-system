# ADR 0001: The Docs group ships static anatomy; interactive behaviour follows the Dialog precedent

**Status**: accepted

## Context

Documentation sites are a dominant consumer shape for this package, and their chrome — skip link, sticky header with a search launcher, section navigation rail, previous/next pager, command-palette search, keyboard-key display, copy buttons, linkable headings — was absent from the catalogue, so every documentation consumer rebuilt it from scratch in site-local CSS.

Several of those patterns are interactive at heart (a palette opens, a copy button confirms, a scroll position highlights a nav item), which collides with two standing principles: the neutral core never resolves React, and consumers ship static HTML and CSS with no bundled runtime behaviour. The package needed a stance on where docs-chrome behaviour lives before the components could be authored.

## Decision

A ninth canonical group, **Docs**, joins the catalogue between Navigation and Marketing. Its components ship exactly what every other group ships: semantic HTML anatomy, token-driven scoped CSS, and an optional build-time React adapter.

Interactive behaviour follows the precedent the Feedback group's modal dialog set:

- Where the **platform** provides the behaviour, the component uses it (the search palette is a native `dialog` driven by `showModal`, like the modal dialog before it).
- Where the React adapter can carry behaviour **without any shipped runtime**, it may (the copy button writes to the clipboard when rendered by a React consumer, exactly as the dialog manages focus).
- Everything else — scroll-spy highlighting, drawer toggling, palette querying — is **consumer-wired**: the components expose the states as documented props and attributes (`aria-current`, `data-discern-copied`, `open`) and never assume a script is present. Statically rendered output is complete and correct with no JavaScript at all.

The package ships **no JavaScript asset**. A behaviour asset emitted alongside fonts and grain (a dependency-free enhancement script consumers could opt into) was considered and deferred: it would be a new artifact class with its own contract, testing surface, and versioning burden, and the group's value does not depend on it.

Layout stays out of the group: the navigation rail is a rail, not a drawer — fixed positioning, veils, and breakpoints belong to the consuming page, which knows its own layout.

## Consequences

- A documentation site can select `groups: ["Docs"]` and receive the whole chrome in one deterministic emission; the discern.sh manual can retire most of its site-local CSS.
- Consumers who want live search, scroll-spy, or copy feedback outside React must wire their own small scripts against the documented class and attribute contract — the same position every non-React consumer is already in for the modal dialog.
- The behaviour-asset door stays open: if several consumers independently write the same enhancement script, shipping one as an optional asset is a compatible, additive change and would get its own ADR.
- The catalogue grows a group whose components are exercised interactively in conformance scenarios through the React adapter, so the anatomy's keyboard and focus behaviour is still browser-tested even though no behaviour ships.

## Alternatives considered

- **Ship an optional behaviour JS asset now.** Rejected for scope: it expands the public contract (a third media type, integrity and versioning of executable code) to solve a problem consumers already solve in a few dozen lines, before any consumer has asked for it.
- **Fold the components into existing groups** (kbd into Display, pager into Navigation). Rejected: the group is the emitter's selection unit, and "everything a documentation page needs" is precisely the selection consumers will make. Individual components remain selectable on their own regardless.
- **CSS-only interactivity** (checkbox hacks, `:target` panels). Rejected: it trades honest semantics for the illusion of behaviour and fails accessibility scans the catalogue enforces.
