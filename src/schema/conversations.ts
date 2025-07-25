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
import { AssetMetadataSchema, AssetSchema, CreateAssetSchema } from "./assets";
import { TipTapSchema } from "./posts";
import { ProfileSchema } from "./users";

const BaseConversationMetadataSchema = object({
  members: array(string()),
});

const ConversationMetadataSchema = BaseConversationMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const ConversationSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.default("conversation"),
  metadata: ConversationMetadataSchema,
  users: optional(nullable(array(ProfileSchema))),
});

const CreateConversationSchema = CreateAssetSchema.extend({
  asset_type: literal("conversation").default("conversation"),
  monetization: MonetizationSchema.default("none"),
  visibility: VisibilitySchema.default("private"),
  metadata: ConversationMetadataSchema,
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
