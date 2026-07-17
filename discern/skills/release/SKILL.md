---
name: release
description: Cut and publish a release of @discern-sh/design-system — walk the version bump, changelog, tag, GitHub release, and JSR publication in the right order, interactively, verifying each step before the next. Use when the user wants to release, publish, ship, or tag a new version, or asks why a release did not reach JSR.
metadata:
  author: "discern-design-system"
  version: "1.0"
---

# Release the design system

This is an **interactive** skill: present each phase's plan, get the user's confirmation, then execute and verify it before moving on. Never batch the whole release into one unreviewed run. JSR versions are immutable — a mistake ships forever and can only be superseded, so the order below is load-bearing.

**How publication actually works (the part that bites):** pushing a tag does nothing by itself. The `Publish` workflow (`.github/workflows/publish.yml`) triggers on a **GitHub release being published**, checks the release tag equals `v<deno.json version>` exactly, runs `deno task verify`, then `deno publish`es to JSR via trusted publishing. So the causal chain is: version bump on `main` → tag → push `main` **and** the tag → `gh release create` → CI publishes. Skipping or reordering a link is how a release strands.

## 1. Preflight — establish the ground truth

Run and report, then confirm the findings with the user:

- `git status` — clean tree, on `main`. `git log origin/main..main --oneline` — anything unpushed rides along with this release; name it.
- `git tag -l` and `gh release list --limit 3` — the last released version, and whether any tag exists without a release (a previously stranded attempt; offer to resume it instead of minting a new version).
- Current version: `deno.json` `version` (must equal `package.json` `version` and the newest `## X.Y.Z` heading in `CHANGELOG.md` — the release test enforces this triple).
- `discern done` on the release tree if there is no green receipt for HEAD — the full gate, including the browser conformance suite, is the release bar.

## 2. Choose the version

Read `CHANGELOG.md`'s `## Unreleased` section (or reconstruct one from `git log v<last>..main`) and propose a bump per SemVer: new component or contract addition → **minor**; fixes only → **patch**; breaking change to any public name, token, manifest field, or export → record it explicitly and (pre-1.0) still **minor**, called out as breaking in the changelog. Ask the user to pick or override.

## 3. Bump — one commit

In a worktree (or on `main` only with the user's explicit say-so):

1. Retitle `## Unreleased` to `## <version>` in `CHANGELOG.md`; make sure every consumer-visible change since the last release is listed.
2. Set `version` in **both** `deno.json` and `package.json`.
3. Commit as `Bump version to <version>`, gate it green (`discern done`), and land it on `main`.

## 4. Tag and push — the remote must have both

```sh
git tag v<version>
git push origin main
git push origin v<version>
```

A tag that only exists locally publishes nothing — pushing it is not optional. Verify with `git ls-remote --tags origin` that the tag arrived, and that `origin/main` contains the bump commit the tag points at.

## 5. Publish the GitHub release — this is the trigger

```sh
gh release create v<version> --title "v<version>" --notes-file <notes>
```

Generate the notes from the changelog section for this version (a temp file is fine). Creating the release **published** is what fires the `Publish` workflow; a draft release fires nothing.

## 6. Watch it land, then verify

- `gh run watch` (or `gh run list --workflow Publish --limit 1`) until the workflow is green. If the tag/version identity check fails, the tag and `deno.json` disagree — fix the version, delete and re-create tag and release, never edit a published JSR version.
- Confirm the version is live: `deno info jsr:@discern-sh/design-system@<version>` resolves, and https://jsr.io/@discern-sh/design-system lists it.
- Report the release URL, the JSR URL, and the workflow run to the user.

## If it went wrong

- **Workflow red after the release was published:** fix on `main`, bump a **new** patch version, and run this skill again — the failed version number is burned; JSR will not accept a retake of a version that partially published.
- **Tag pushed but no release created:** nothing has published; create the release for the existing tag (step 5) and continue.
- **Wrong changelog or notes, publish already green:** the JSR artifact is immutable; fix the changelog on `main` for the record and edit the GitHub release notes — do not re-tag.
