import { z } from "zod";

import { AssetTypeSchema } from "./common";

const NotificationTypeSchema = z.enum([
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

const NotificationSchema = z.object({
  id: z.string().uuid(),
  source_user_id: z.string().uuid(),
  destination_user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  asset_id: z.string().uuid().optional().nullable(),
  type: NotificationTypeSchema,
  content: z.object({
    text: z.string().optional(),
    asset: z
      .object({
        assetId: z.string(),
        assetType: AssetTypeSchema,
      })
      .optional(),
    mention: z.object({}).optional(),
    event: z
      .object({
        type: z.enum(["success", "error"]),
      })
      .optional(),
  }),
  viewed: z.boolean(),
  created_at: z.string(),
  last_updated: z.string(),
});

type Notification = z.infer<typeof NotificationSchema>;

export { NotificationSchema, type Notification };
