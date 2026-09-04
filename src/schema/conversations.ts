import {
  object,
  string,
  number,
  uuid,
  array,
  type z,
  record,
  any,
  optional,
  nullable,
  literal,
  union
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
import { ContentActionRefSchema } from "./content-refs";
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
  // Agents often name conversations after the first exchange; allow null until then.
  name: nullable(string()),
  metadata: ConversationMetadataSchema,
  users: optional(nullable(array(ProfileSchema))),
});

const BaseCreateConversationSchema = CreateAssetSchema.extend({
  asset_type: literal("conversation").default("conversation"),
  monetization: MonetizationSchema.default("none"),
  visibility: VisibilitySchema.default("private"),
  // Optional like posts — leave blank and let a responding agent name it.
  name: string()
    .optional()
    .nullable()
    .default("")
    .transform((x) => x?.trim())
    .transform((x) => x || null),
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

const MessageReactionValueSchema = union([
  literal("heart"),
  literal("thumbs-up"),
  literal("thumbs-down"),
  literal("question"),
  literal("skull"),
]);

const MessageReactionSchema = object({
  id: uuid(),
  message_id: uuid(),
  conversation_id: uuid(),
  user_id: uuid(),
  value: MessageReactionValueSchema,
  created_at: string(),
});

const MessageSchema = object({
  id: uuid(),
  conversation_id: uuid(),
  turn_id: uuid(),
  seq: number(),
  user_id: uuid(),
  user: optional(nullable(ProfileSchema)),
  type: string().default("message"),
  created_at: string(),
  last_updated: string(),
  viewers: array(uuid()),
  json: TipTapSchema,
  text: string(),
  metadata: optional(nullable(record(string(), any()))),
  reactions: optional(nullable(array(MessageReactionSchema))),
  // Resolved from message content embeds / links at read time
  assets: optional(nullable(array(AssetSchema.partial()))),
  users: optional(nullable(array(ProfileSchema.partial()))),
  actions: optional(nullable(array(ContentActionRefSchema))),
});

export {
  MessageReactionValueSchema,
  MessageReactionSchema,
  MessageSchema,
  UpdateConversationSchema,
  CreateConversationSchema,
  ConversationSchema,
};
export type Conversation = z.infer<typeof ConversationSchema>;
export type CreateConversation = z.infer<typeof CreateConversationSchema>;
export type UpdateConversation = z.infer<typeof UpdateConversationSchema>;
export type MessageReactionValue = z.infer<typeof MessageReactionValueSchema>;
export type MessageReaction = z.infer<typeof MessageReactionSchema>;
export type Message = z.infer<typeof MessageSchema>;
