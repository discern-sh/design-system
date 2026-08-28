# ADR 0035: Present single-choice menus as focus-driven inspectors

**Status**: accepted

## Context

[ADR-0021](0021-own-terminal-reading-presentations-and-completion.md)
introduced descriptions and the additive `form | browsing` presentation
choice. That grammar serves forms and document pickers, but it is misleading
for command menus. A highlighted radio mark looks like a value has already been
selected, disabled rows cannot be focused to explain their state, and repeating
every description beneath its row makes action lists tall and visually noisy.
The full-width choice-frame default and motif-led group rules amplify that noise
on wide terminals.

Consumers could build a bespoke action picker around the low-level interaction
driver, but that would duplicate keyboard, viewport, restoration, disabled, and
search semantics outside the package. Adding a new request verb or Component
would duplicate the same single-choice data and state with a second public
contract.

## Decision

Single-choice interactions accept
`InteractionSelectionPresentation = InteractionChoicePresentation | "menu"`.
`requestSelection`, `requestSearch`, and their pure Select and Radio frame
states accept that presentation. Multi-selection remains
`InteractionChoicePresentation`, whose values are only `form | browsing`.
There is no `requestMenu` operation and no Menu Component.

`menu` means focus rather than selection. Exactly one pointer marks the focused
choice and active frames emit no selected-radio mark. Disabled choices remain
focusable but Enter never activates them; `×` in Unicode or `x` in ASCII and
muted ink carry their unavailable state without a second typographic dim.
Structural headings render as compact labels without collapse triangles, motif
rules, descriptions, or a leading blank row before the first group.

The shared choice renderer moves the focused choice description and its
governing group description below one quiet divider. It reserves the longest
current detail's wrapped height so focus movement cannot shift the frame,
capped at three lines and further reduced only when renderer-measured viewport
fitting requires it. Overflow ellipsizes only the final visible detail line.
Search continues to match authored labels and descriptions through the existing
static filtering authority even though descriptions no longer render inline.
Provider-backed search carries its complete current result set through pure
frame state only to reserve stable inspector geometry.

Menu frames default to the Token-authored readable measure rather than using
every available terminal column. An explicit width remains authoritative. The
default presentation and `browsing` preserve their established bytes.

## Consequences

Action menus, route pickers, and other one-shot navigation can share one public
keyboard and rendering grammar without pretending focus is a chosen value.
Unavailable actions stay visible and inspectable, descriptions remain
searchable, group hierarchy becomes quieter, and moving focus has stable
geometry across colour, no-colour, Unicode, ASCII, width, and resize postures.

The single- and multi-choice presentation types deliberately diverge. A helper
that accepts either API must preserve that distinction instead of widening
multi-selection to `menu`. Search menu states carry additional non-rendered
entries for geometry, and very short viewports may reserve fewer than three
detail rows to keep the complete frame addressable.

## Alternatives considered

A dedicated `requestMenu` would make the call site explicit but fork the
single-choice machine, types, validation, testing, and future behavior
enrollment. A new Menu Component would misplace an interaction posture in the
Component inventory. Keeping disabled choices out of focus preserves older
navigation but makes their explanations unreachable. Showing descriptions on
every row preserves local proximity at the cost of the density and stable
scanning that command menus need.
