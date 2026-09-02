import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "../../src/components/display/card/card.tsx";
import { Kicker } from "../../src/components/display/kicker/kicker.tsx";
import { CopyButton } from "../../src/components/docs/copy-button/copy-button.tsx";
import {
  type CataloguePurpose,
  cataloguePurposes,
  type ComponentGroup,
  componentGroups,
} from "../../src/types/component-meta.ts";
import type { RegistryEntry } from "../generated/registry.ts";
import { catalogueDecisionCopyProps } from "../metadata-copy.ts";
import { catalogueGroupSlug, catalogueRoutePaths } from "../routes.ts";

export type CatalogueSurface = "web" | "cli";

export function cataloguePurpose(
  value: string | null,
): CataloguePurpose | undefined {
  return cataloguePurposes.find((purpose) => purpose === value);
}

export function catalogueSurface(value: string | null): CatalogueSurface {
  return value === "cli" ? "cli" : "web";
}

export function stateFragmentId(component: string, state: string): string {
  return `component-${component}--${state}`;
}

export function groupComponentEntries(entries: readonly RegistryEntry[]) {
  return componentGroups.map((group) => ({
    group,
    entries: entries.filter(({ meta }) => meta.group === group),
  })).filter(({ entries: groupedEntries }) => groupedEntries.length);
}

export function catalogueHref(
  path: string,
  parameters: Readonly<Record<string, string | undefined>> = {},
): string {
  const url = new URL(path, "https://catalogue.invalid");
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  return url.pathname + url.search + url.hash;
}

export function componentGroupHref(group: ComponentGroup): string {
  return catalogueHref(catalogueRoutePaths.components, {
    group: catalogueGroupSlug(group),
  });
}

export function componentPurposeHref(purpose: CataloguePurpose): string {
  return catalogueHref(catalogueRoutePaths.components, { purpose });
}

export function compareHref(
  {
    group,
    purpose,
    all,
    surface,
  }: {
    readonly group?: ComponentGroup | undefined;
    readonly purpose?: CataloguePurpose | undefined;
    readonly all?: boolean;
    readonly surface?: CatalogueSurface;
  },
): string {
  return catalogueHref(catalogueRoutePaths.compare, {
    group: group === undefined ? undefined : catalogueGroupSlug(group),
    purpose,
    scope: all ? "all" : undefined,
    surface: surface === "cli" ? "cli" : undefined,
  });
}

export function CataloguePageHeader(
  {
    index,
    eyebrow,
    title,
    description,
  }: {
    readonly index: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  },
) {
  return (
    <header className="discern-catalogue-page__header">
      <Kicker index={index}>— {eyebrow}</Kicker>
      <h1>{title}</h1>
      <p {...catalogueDecisionCopyProps}>{description}</p>
    </header>
  );
}

export type CatalogueIndexCardVariant = "visual" | "compact";

export interface CatalogueIndexCardAction {
  readonly href: string;
  readonly label: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export interface CatalogueIndexCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly variant?: CatalogueIndexCardVariant;
  readonly headingLevel?: 2 | 3;
  readonly primaryAriaLabel?: string;
  readonly primaryClassName?: string;
  readonly descriptionClassName?: string;
  readonly eyebrow?: ReactNode;
  readonly media?: ReactNode;
  readonly metadata?: ReactNode;
  readonly secondaryActions?: readonly CatalogueIndexCardAction[];
}

/**
 * The one Catalogue route-index surface. Its primary link owns the full card
 * while an optional secondary action remains a separate interactive sibling.
 */
export function CatalogueIndexCard(
  {
    href,
    eyebrow,
    title,
    description,
    action,
    variant = "visual",
    headingLevel = 2,
    primaryAriaLabel = `${action}: ${title}`,
    primaryClassName,
    descriptionClassName,
    media,
    metadata,
    secondaryActions = [],
    className,
    ...articleProps
  }: CatalogueIndexCardProps,
) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      {...articleProps}
      className={`discern-catalogue-index-card-shell${
        className === undefined ? "" : ` ${className}`
      }`}
      data-discern-catalogue-index-card={variant}
    >
      <Card
        raised
        padding="none"
        className={`discern-catalogue-index-card discern-catalogue-index-card--${variant}`}
      >
        <a
          className={`discern-catalogue-index-card__primary${
            primaryClassName === undefined ? "" : ` ${primaryClassName}`
          }`}
          href={href}
          aria-label={primaryAriaLabel}
          data-discern-catalogue-index-card-primary=""
        >
          {media === undefined
            ? null
            : <div className="discern-catalogue-index-card__media">{media}
            </div>}
          <div className="discern-catalogue-index-card__body">
            {eyebrow === undefined
              ? null
              : (
                <span className="discern-catalogue-index-card__eyebrow">
                  {eyebrow}
                </span>
              )}
            <Heading>{title}</Heading>
            <p
              className={descriptionClassName ??
                "discern-catalogue-index-card__description"}
              {...catalogueDecisionCopyProps}
            >
              {description}
            </p>
            {metadata === undefined
              ? null
              : (
                <div className="discern-catalogue-index-card__metadata">
                  {metadata}
                </div>
              )}
            <span className="discern-catalogue-index-card__action">
              {action}
              <span
                className="discern-catalogue-index-card__action-arrow"
                aria-hidden="true"
              >
                →
              </span>
            </span>
          </div>
        </a>
        {secondaryActions.length === 0
          ? null
          : (
            <div className="discern-catalogue-index-card__secondary-actions">
              {secondaryActions.map((secondaryAction) => (
                <a
                  className={`discern-catalogue-index-card__secondary${
                    secondaryAction.className === undefined
                      ? ""
                      : ` ${secondaryAction.className}`
                  }`}
                  href={secondaryAction.href}
                  aria-label={secondaryAction.ariaLabel}
                  data-discern-catalogue-index-card-secondary=""
                  key={`${secondaryAction.href}:${secondaryAction.label}`}
                >
                  {secondaryAction.label}
                </a>
              ))}
            </div>
          )}
      </Card>
    </article>
  );
}

export function CopyableCode(
  { label, value }: { readonly label: string; readonly value: string },
) {
  return (
    <div className="discern-catalogue-copyable">
      <span>{label}</span>
      <code>{value}</code>
      <CopyButton
        value={value}
        label={`Copy ${label.toLowerCase()}`}
        copiedLabel={`${label} copied`}
      />
    </div>
  );
}
