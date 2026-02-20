/**
 * Cross-entity navigation utilities.
 * Provides URL builders and a programmatic navigation helper
 * so any entity reference can be made clickable.
 */

export type NavigableEntity =
  | "policy"
  | "control"
  | "regulation"
  | "risk"
  | "action"
  | "risk-acceptance";

const URL_BUILDERS: Record<NavigableEntity, (id: string) => string> = {
  policy: (id) => `/compliance?tab=policies&policy=${id}`,
  control: (id) => `/controls?tab=library&control=${id}`,
  regulation: (id) => `/compliance?tab=regulatory-universe&regulation=${id}`,
  risk: (id) => `/risk-register?risk=${id}`,
  action: (id) => `/actions?action=${id}`,
  "risk-acceptance": (id) => `/risk-acceptances?acceptance=${id}`,
};

export function getEntityUrl(type: NavigableEntity, id: string): string {
  return URL_BUILDERS[type](id);
}

/**
 * Push current location onto the back stack and navigate to the entity.
 * Call from click handlers on EntityLink badges.
 */
export function navigateToEntity(
  type: NavigableEntity,
  id: string,
  pushStack: (url: string) => void,
) {
  pushStack(window.location.pathname + window.location.search);
  window.location.href = getEntityUrl(type, id);
}

/** Badge colour map keyed by entity type — used by EntityLink. */
export const ENTITY_BADGE_STYLES: Record<
  NavigableEntity,
  { bg: string; text: string; hoverBg: string }
> = {
  policy: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    hoverBg: "hover:bg-blue-100",
  },
  control: {
    bg: "bg-updraft-pale-purple/30",
    text: "text-updraft-deep",
    hoverBg: "hover:bg-updraft-pale-purple/50",
  },
  regulation: {
    bg: "bg-green-50",
    text: "text-green-700",
    hoverBg: "hover:bg-green-100",
  },
  risk: {
    bg: "bg-red-50",
    text: "text-red-700",
    hoverBg: "hover:bg-red-100",
  },
  action: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    hoverBg: "hover:bg-amber-100",
  },
  "risk-acceptance": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    hoverBg: "hover:bg-purple-100",
  },
};
