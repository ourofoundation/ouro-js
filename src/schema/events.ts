/**
 * Shared registry of webhook event types emitted by the Ouro platform.
 *
 * This is the single source of truth used by the backend (event dispatch),
 * the frontend (settings UI), the Python SDK (`ouro-py`), and the agent
 * runtime (`ouro-agents`). Adding a new event type means adding a single
 * entry here.
 */

export interface WebhookEventDefinition {
  /** Human-readable label rendered in the user-facing settings UI. */
  label: string;
  /** Whether users can subscribe to this event via a webhook URL. */
  userSubscribable: boolean;
  /** What kind of resource the event is bound to. Drives recipient resolution. */
  scope: "asset" | "user" | "conversation";
}

export const WEBHOOK_EVENTS = {
  comment: {
    label: "Comments",
    userSubscribable: true,
    scope: "asset",
  },
  mention: {
    label: "Mentions",
    userSubscribable: true,
    scope: "asset",
  },
  reference: {
    label: "References",
    userSubscribable: true,
    scope: "asset",
  },
  reaction: {
    label: "Reactions",
    userSubscribable: true,
    scope: "asset",
  },
  share: {
    label: "Shares",
    userSubscribable: true,
    scope: "asset",
  },
  follow: {
    label: "Follows",
    userSubscribable: true,
    scope: "user",
  },
  action: {
    label: "Actions",
    userSubscribable: true,
    scope: "asset",
  },
  "asset.deleted": {
    label: "Asset deletions",
    userSubscribable: true,
    scope: "asset",
  },
  "new-conversation": {
    label: "Conversations",
    userSubscribable: true,
    scope: "conversation",
  },
  "new-message": {
    label: "Messages",
    userSubscribable: true,
    scope: "conversation",
  },
} as const satisfies Record<string, WebhookEventDefinition>;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;

export const WEBHOOK_EVENT_TYPES = Object.keys(
  WEBHOOK_EVENTS
) as WebhookEventType[];

export const USER_SUBSCRIBABLE_WEBHOOK_EVENTS = (
  Object.entries(WEBHOOK_EVENTS) as [
    WebhookEventType,
    WebhookEventDefinition,
  ][]
)
  .filter(([, def]) => def.userSubscribable)
  .map(([value, def]) => ({ value, label: def.label }));

export interface WebhookActor {
  id: string;
  username: string;
  is_agent: boolean;
}

export interface WebhookAssetRef {
  id: string;
  type: string;
}

export interface WebhookOrgRef {
  id: string;
  name: string;
}

export interface WebhookTeamRef {
  id: string;
  name: string;
}

/**
 * Canonical envelope for every webhook event delivery.
 *
 * `data` is event-specific; consumers should branch on `event` and treat
 * `data` as a typed payload accordingly.
 */
export interface WebhookPayload<
  T extends WebhookEventType = WebhookEventType,
  D = unknown,
> {
  /** Stable per-delivery UUID. Receivers should dedupe on this. */
  delivery_id: string;
  event: T;
  /** ISO timestamp of when the event was produced (not when it was sent). */
  timestamp: string;
  /** The recipient user_id this delivery is targeted at. */
  user_id: string;
  /** Correlated in-app notification id when there is exactly one. */
  notification_id?: string;
  /** Correlated in-app notification ids when an event covers multiple. */
  notification_ids?: string[];
  data: D;
}
