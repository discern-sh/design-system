/**
 * Screen-managed navigation for the playground's maintainer-facing menus.
 * Demonstration journeys still call the public request APIs directly so they
 * review the ordinary inline lifecycle; orchestration menus pass through this
 * boundary so they never leave submitted frames in normal scrollback.
 *
 * @module
 */

import {
  type InteractionEntry,
  requestSearch,
  requestSelection,
  type SearchRequestOptions,
  type SelectionRequestOptions,
  type TerminalIO,
} from "../../src/cli/interactive/mod.ts";

/** Options shared by a remembered playground navigation choice. */
export type PlaygroundNavigationOptions<T> =
  & Omit<
    SelectionRequestOptions<T>,
    "completion" | "initialId" | "presentation"
  >
  & { readonly initialId?: string };

/** Options shared by searchable, remembered playground navigation. */
export type PlaygroundSearchOptions<T> =
  & Omit<
    SearchRequestOptions<T>,
    "completion" | "initialId" | "presentation" | "search"
  >
  & {
    readonly choices: readonly InteractionEntry<T>[];
    readonly initialId?: string;
  };

/** One stateful navigation session shared across every playground level. */
export interface PlaygroundNavigator {
  /** Choose on a transient alternate screen when terminal control permits. */
  choose<T>(
    key: string,
    options: PlaygroundNavigationOptions<T>,
  ): Promise<T | undefined>;
  /** Search static choices on a transient alternate screen. */
  search<T>(
    key: string,
    options: PlaygroundSearchOptions<T>,
  ): Promise<T | undefined>;
  /** Choose beneath caller-owned output, then erase only the menu frame. */
  chooseInline<T>(
    key: string,
    options: PlaygroundNavigationOptions<T>,
  ): Promise<T | undefined>;
}

function selectedEntryId<T>(
  entries: readonly InteractionEntry<T>[],
  value: T | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return entries.find((entry) =>
    entry.kind !== "group-heading" && entry.value === value
  )?.id;
}

/** Build the single navigation authority for one playground invocation. */
export function createPlaygroundNavigator(io: TerminalIO): PlaygroundNavigator {
  const remembered = new Map<string, string>();
  const presentation = {
    completion: io.capabilities().ansiControl === false
      ? "retain-frame" as const
      : "clear-frame" as const,
    presentation: "browsing" as const,
  };

  const choose = async <T>(
    key: string,
    options: PlaygroundNavigationOptions<T>,
    alternateScreen: boolean,
  ): Promise<T | undefined> => {
    const initialId = remembered.get(key) ?? options.initialId;
    const value = await requestSelection({
      ...options,
      ...presentation,
      ...(initialId === undefined ? {} : { initialId }),
    }, {
      io,
      alternateScreen: alternateScreen &&
        io.capabilities().ansiControl !== false,
    });
    const id = selectedEntryId(options.choices, value);
    if (id !== undefined) remembered.set(key, id);
    return value;
  };

  return {
    choose: (key, options) => choose(key, options, true),
    chooseInline: (key, options) => choose(key, options, false),
    async search<T>(
      key: string,
      options: PlaygroundSearchOptions<T>,
    ): Promise<T | undefined> {
      const initialId = remembered.get(key) ?? options.initialId;
      const { choices, ...request } = options;
      const value = await requestSearch({
        ...request,
        search: choices,
        ...presentation,
        ...(initialId === undefined ? {} : { initialId }),
      }, {
        io,
        alternateScreen: io.capabilities().ansiControl !== false,
      });
      const id = selectedEntryId(choices, value);
      if (id !== undefined) remembered.set(key, id);
      return value;
    },
  };
}
