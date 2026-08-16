import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { DestructiveActionNotice } from "../destructive-action-notice/destructive-action-notice.tsx";
import { RetryNotice } from "../retry-notice/retry-notice.tsx";
import { Procedure } from "./procedure.tsx";

export const conformance = [{
  name: "branch routes follow document keyboard order",
  steps: [
    {
      action: "focus",
      target: {
        selector: '[data-example-procedure-full] a[href="#restore-copy"]',
      },
    },
    { action: "press", key: "Tab" },
    {
      expect: "focused",
      target: {
        selector: '[data-example-procedure-full] a[href="#keep-backup"]',
      },
    },
  ],
}, {
  name: "the full procedure stays contained at a narrow viewport",
  viewport: { width: 390, height: 5000 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-procedure-full]" },
  }],
}] satisfies readonly ConformanceScenario[];

export default function ProcedureExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Procedure
        title="Back up and restore a directory"
        description={
          <p>
            Make a dated archive, verify that it can be read, then restore into
            a separate destination before replacing anything.
          </p>
        }
        prerequisites={{
          items: [
            {
              requirement: "The source directory is readable.",
              state: "satisfied",
              detail: "Confirmed with the current user.",
            },
            {
              requirement: "The destination has enough free space.",
              state: "satisfied",
              detail: "Allow room for both the archive and restored copy.",
            },
          ],
        }}
        steps={[
          {
            title: "Create the archive",
            action: (
              <p>
                Write the source directory to a new archive without changing the
                original files.
              </p>
            ),
            command: {
              command:
                'tar -czf "/path/to/backups/project-2026-07-27.tar.gz" -C "/path/to/source" .',
              workingDirectory: "/path/to/source",
              explanation:
                "The -C option records relative entries instead of the source directory's full path.",
              copyLabel: "Copy archive command",
              copiedLabel: "Archive command copied",
            },
            expectedResult: {
              variant: "state",
              children:
                "The backup directory contains a new archive and the command exits successfully.",
            },
            completionCriterion:
              "The archive exists outside the source directory and has a non-zero size.",
            recovery: (
              <RetryNotice
                safeToRetry
                reason="The command writes a new dated archive and does not mutate the source directory. Remove a partial archive before repeating it with the same name."
              />
            ),
          },
          {
            id: "inspect-backup",
            title: "Inspect the archive",
            action: (
              <p>
                List the stored paths before attempting a restore. Check the
                first and last entries for the expected directory shape.
              </p>
            ),
            command: {
              command: 'tar -tzf "/path/to/backups/project-2026-07-27.tar.gz"',
              explanation:
                "Reads the archive table of contents without extracting any files.",
              copyLabel: "Copy inspection command",
              copiedLabel: "Inspection command copied",
            },
            expectedResult: {
              children: "./\n./documents/\n./documents/notes.txt",
            },
            completionCriterion:
              "The listing contains the expected relative paths and reports no read error.",
            recovery:
              "Do not restore from an archive that cannot be listed. Keep the source untouched and create a fresh archive.",
          },
          {
            title: "Choose the next path",
            action: (
              <p>
                Continue only after the archive listing matches the source you
                intended to preserve.
              </p>
            ),
            branch: {
              choices: [
                {
                  label: "The listing is correct",
                  path: "Restore into a separate directory",
                  href: "#restore-copy",
                },
                {
                  label: "The listing is incomplete",
                  path: "Keep the source and create another backup",
                  href: "#keep-backup",
                },
              ],
            },
            completionCriterion:
              "You have selected the path that matches the observed archive, not the expected one.",
          },
          {
            id: "restore-copy",
            title: "Restore into a separate directory",
            action: (
              <>
                <p>
                  Extract beside the source first. Replacing the original
                  directory is a separate owner decision.
                </p>
                <DestructiveActionNotice
                  label="Warning: replacing the source is owner-only"
                  scope="Only the original source directory, after the restored copy has been inspected."
                  impact="Replacing it discards any changes made after the archive was created."
                  authority="The directory owner must approve the replacement."
                  recovery="Keep the original under a temporary name until the restored copy has been verified."
                />
              </>
            ),
            command: {
              command:
                'mkdir -p "/path/to/restore-check" && tar -xzf "/path/to/backups/project-2026-07-27.tar.gz" -C "/path/to/restore-check"',
              explanation:
                "Creates a clean destination and extracts the archive without touching the source.",
              copyLabel: "Copy restore command",
              copiedLabel: "Restore command copied",
            },
            expectedResult: {
              variant: "state",
              children:
                "The restore-check directory contains a readable copy of the archived files.",
            },
            completionCriterion:
              "Representative restored files open successfully and the original source still exists.",
            recovery:
              "Remove only the incomplete restore-check directory. The archive and original source remain available.",
          },
        ]}
        completion="The archive can be listed, a separate restored copy has been inspected, and the untouched source remains available until an owner approves any replacement."
        data-example-procedure-full
      />

      <Procedure
        title="Resume an interrupted archive"
        description={
          <p>
            Recover from a stopped compression process without guessing which
            bytes are complete.
          </p>
        }
        prerequisites={{
          items: [
            {
              requirement: "The source directory is still available.",
              state: "satisfied",
            },
            {
              requirement: "The partial archive has been identified.",
              state: "unresolved",
              detail: "Locate it before starting the cleanup step.",
            },
          ],
        }}
        steps={[
          {
            id: "keep-backup",
            title: "Separate the partial output",
            action: (
              <p>
                Rename the incomplete archive so the next run cannot be mistaken
                for a continuation.
              </p>
            ),
            command: {
              command:
                'mv "/path/to/backups/project.tar.gz" "/path/to/backups/project.partial.tar.gz"',
              explanation:
                "Preserves the interrupted output for diagnosis while clearing the intended archive name.",
              copyLabel: "Copy rename command",
              copiedLabel: "Rename command copied",
            },
            recoveryLabel: "If you stopped here",
            recovery: (
              <RetryNotice
                safeToRetry={false}
                reason="Do not repeat the rename after it succeeds. Confirm which filename exists, then continue from the observed state."
              />
            ),
            completionCriterion:
              "Only the .partial.tar.gz name exists for the interrupted output.",
          },
          {
            title: "Create a fresh archive",
            action: (
              <p>
                Start from the unchanged source and write to the now-clear
                destination name.
              </p>
            ),
            command: {
              command:
                'tar -czf "/path/to/backups/project.tar.gz" -C "/path/to/source" .',
              copyLabel: "Copy fresh archive command",
              copiedLabel: "Fresh archive command copied",
            },
            expectedResult: {
              variant: "state",
              children:
                "A new readable archive exists beside the preserved partial output.",
            },
            recovery: (
              <RetryNotice
                safeToRetry
                reason="The source remains unchanged. Remove only the new incomplete archive before starting another fresh attempt."
              />
            ),
          },
        ]}
        completion="The fresh archive lists successfully and the partial output is clearly named for later removal or diagnosis."
      />

      <Procedure
        title="Move a large directory in reviewable stages"
        description={
          <p>
            A deliberately long sequence demonstrates wrapping, horizontal
            command overflow, and stable numbering at a narrow width.
          </p>
        }
        steps={[
          {
            title: "Record the source location",
            action:
              "Write down the canonical source path before creating any destination directories.",
          },
          {
            title: "Create the destination",
            action:
              "Create an empty destination that is outside the source tree.",
          },
          {
            title: "Copy without deleting",
            action:
              "Preserve the source while transferring nested files, metadata, and long path segments.",
            command: {
              command:
                'rsync -a --progress "/path/to/a/source-directory-with-a-deliberately-long-name/" "/path/to/a/destination-directory-with-an-equally-long-name/"',
              explanation:
                "The trailing separators copy directory contents while leaving the source intact.",
              copyLabel: "Copy staged transfer command",
              copiedLabel: "Staged transfer command copied",
            },
          },
          {
            title: "Compare directory sizes",
            action:
              "Measure both trees and investigate any unexplained difference before continuing.",
          },
          {
            title: "Open representative files",
            action:
              "Read files from shallow and deeply nested paths in the destination.",
          },
          {
            title: "Choose whether to retain the source",
            action:
              "Keep the source until the destination has passed independent review.",
          },
          {
            title: "Record the handoff",
            action:
              "State which path is authoritative, which copy is temporary, and who may remove it.",
          },
        ]}
        completion="Every copied path has been checked, the authoritative location is recorded, and deletion remains a separate approved action."
        data-example-procedure-overflow
      />
    </div>
  );
}
