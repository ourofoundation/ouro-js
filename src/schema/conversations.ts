import {
  object,
  string,
  uuid,
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
import {
  AssetMetadataSchema,
  AssetSchema,
  CreateAssetSchema,
  normalizeAssetConfigForParsing,
} from "./assets";
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

const BaseCreateConversationSchema = CreateAssetSchema.extend({
  asset_type: literal("conversation").default("conversation"),
  monetization: MonetizationSchema.default("none"),
  visibility: VisibilitySchema.default("private"),
  metadata: ConversationMetadataSchema,
});

const CreateConversationSchema = BaseCreateConversationSchema
  .transform((value) => normalizeAssetConfigForParsing(value));

// Partial because we can make updates to conversations without providing all fields
const UpdateConversationSchema = BaseCreateConversationSchema.omit({
  id: true,
  org_id: true,
  team_id: true,
  // team: true,
  // user: true,
  // organization: true,
  // slug: true,
}).partial().transform((value) => normalizeAssetConfigForParsing(value));

const MessageSchema = object({
  id: uuid(),
  conversation_id: uuid(),
  user_id: uuid(),
  user: optional(nullable(ProfileSchema)),
  created_at: string(),
  last_updated: string(),
  viewers: array(uuid()),
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
