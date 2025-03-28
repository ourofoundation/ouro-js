import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  array,
  type z,
  record,
  any,
  optional,
  nullable,
  literal
} from "zod";

import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";
import { AssetSchema } from "./assets";
import { TipTapSchema } from "./posts";
import { ProfileSchema } from "./users";

const ConversationSchema = AssetSchema.extend({
  metadata: object({
    members: array(string()),
  }),
  asset_type: AssetTypeSchema.default("conversation"),
  users: optional(nullable(array(ProfileSchema))),
});

const CreateConversationSchema = ConversationSchema.omit({
  org_id: true,
  team_id: true,
  user_id: true,
  created_at: true,
  last_updated: true,
}).extend({
  id: string()
    .uuid()
    .default(() => uuidv7()),
  org_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
  team_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
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

const MessageSchema = object({
  id: string().uuid(),
  conversation_id: string().uuid(),
  user_id: string().uuid(),
  user: optional(nullable(ProfileSchema)),
  created_at: string(),
  last_updated: string(),
  viewers: array(string().uuid()),
  json: TipTapSchema,
  text: string(),
  metadata: optional(nullable(record(string(), any()))),
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
