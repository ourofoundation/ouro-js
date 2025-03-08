import { uuidv7 } from "uuidv7";
import { z } from "zod";

import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";
import { AssetSchema } from "./assets";
import { TipTapSchema } from "./posts";

const ConversationSchema = AssetSchema.extend({
  metadata: z.object({
    members: z.array(z.string()),
  }),
  asset_type: AssetTypeSchema.default("conversation"),
});

const CreateConversationSchema = ConversationSchema.omit({
  org_id: true,
  team_id: true,
  user_id: true,
  created_at: true,
  last_updated: true,
}).extend({
  id: z
    .string()
    .uuid()
    .default(() => uuidv7()),
  org_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
  team_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
  monetization: MonetizationSchema.default("none"),
  visibility: VisibilitySchema.default("private"),
});

// Partial because we can make updates to conversations without providing all fields
const UpdateConversationSchema = CreateConversationSchema.omit({
  id: true,
  org_id: true,
  team_id: true,
  team: true,
  user: true,
  organization: true,
  slug: true,
}).partial();

const MessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  last_updated: z.string().datetime(),
  viewers: z.array(z.string().uuid()),
  json: TipTapSchema,
  text: z.string(),
  metadata: z.object({}).passthrough().nullable().optional(),
});

export {
  MessageSchema,
  UpdateConversationSchema,
  CreateConversationSchema,
  ConversationSchema,
};
export type Conversation = z.infer<typeof ConversationSchema>;
export type CreateConversation = z.infer<typeof CreateConversationSchema>;
export type UpdateConversation = z.infer<typeof UpdateConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
