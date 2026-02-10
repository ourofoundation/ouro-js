import {
  object,
  string,
  boolean,
  type z,
  enum as zodEnum,
  optional,
  uuid
} from "zod";

import { AssetTypeSchema } from "./common";

const NotificationTypeSchema = zodEnum([
  "follow",
  "like",
  "comment",
  "reply",
  "mention",
  "reference",
  "invite",
  "payment",
  "event",
  "share",
  "badge",
  "reaction",
  "deposit",
  "action-complete",
  "action-failed",
  "quest-entry",
  "quest-entry-accepted",
  "onboarding-complete",
  "onboarding-action-required",
  "route-earnings-milestone",
  "route-payout",
  "other",
]);

const NotificationSchema = object({
  id: uuid(),
  source_user_id: uuid(),
  destination_user_id: uuid(),
  org_id: optional(uuid()),
  asset_id: optional(uuid()),
  reaction_id: optional(uuid()),
  action_id: optional(uuid()),
  type: NotificationTypeSchema,
  content: object({
    text: optional(string()),
    asset: optional(
      object({
        assetId: string(),
        assetType: AssetTypeSchema,
      })
    ),
    mention: optional(object({})),
    event: optional(
      object({
        type: zodEnum(["success", "error"]),
      })
    ),
    badge: optional(
      object({
        name: string(),
        description: optional(string()),
        slug: optional(string()),
      })
    ),
    value: optional(string()),
  }).loose(),
  viewed: boolean(),
  created_at: string(),
  last_updated: string(),
});

export { NotificationSchema };
export type Notification = z.infer<typeof NotificationSchema>;
