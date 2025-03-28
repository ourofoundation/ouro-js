import {
  object,
  string,
  boolean,
  type z,
  enum as zodEnum,
  optional
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
  "other",
]);

const NotificationSchema = object({
  id: string().uuid(),
  source_user_id: string().uuid(),
  destination_user_id: string().uuid(),
  org_id: string().uuid(),
  asset_id: optional(string().uuid()),
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
  }),
  viewed: boolean(),
  created_at: string(),
  last_updated: string(),
});

export { NotificationSchema };
export type Notification = z.infer<typeof NotificationSchema>;
