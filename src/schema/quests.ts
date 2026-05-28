import {
  object,
  string,
  number,
  array,
  literal,
  record,
  type z,
  any,
  optional,
  nullable,
  union,
  uuid,
  boolean as zodBoolean,
  enum as zodEnum,
  type ZodType,
} from "zod";

import {
  AssetSchema,
  AssetMetadataSchema,
  CreateAssetSchema,
  normalizeAssetConfigForParsing,
} from "./assets";
import { AssetTypeSchema } from "./common";
import {
  KeyedAssetRefsSchema,
  KeyedAssetInputSchema,
  QuestSubmissionAssetDeclarationSchema,
} from "../utils/quest-submission";

// ── Enums ──────────────────────────────────────────────────────────────

/** closable: one active entry per item per user; continuous: unlimited per item */
const QuestTypeSchema = zodEnum(["closable", "continuous"]);
const QuestStatusSchema = zodEnum(["draft", "open", "closed", "cancelled"]);

const QuestItemStatusSchema = zodEnum([
  "pending",
  "in_progress",
  "done",
  "skipped",
]);

const RewardCurrencySchema = zodEnum(["btc", "usd"]);

const EntryEvalStatusSchema = zodEnum([
  "skipped",
  "running",
  "passed",
  "failed",
  "errored",
]);

const EntryStatusSchema = zodEnum(["submitted", "accepted", "rejected"]);

// ── Content (TipTap) ───────────────────────────────────────────────────
// Posts/quests share the same rich description shape: { json, text }.
// We mirror it locally here so the quest schema doesn't depend on posts.

const TipTapNode: ZodType<any> = object({
  type: string(),
  content: optional(array(any())),
  attrs: optional(record(string(), any())),
  marks: optional(array(any())),
  text: optional(string()),
});

const ContentSchema = object({
  json: object({
    type: literal("doc"),
    content: array(TipTapNode),
  }),
  text: string(),
});

// ── Quest items ────────────────────────────────────────────────────────

const QuestItemBaseSchema = object({
  id: uuid(),
  quest_id: uuid(),
  description: string(),
  status: QuestItemStatusSchema.default("pending"),
  auto_skipped: optional(nullable(string().or(any()))),
  status_before_auto_skip: optional(nullable(QuestItemStatusSchema)),
  sort_order: number().default(0),
  type: string().default("task"),
  created_by: uuid(),
  assignee_id: optional(nullable(uuid())),
  expected_asset_type: optional(nullable(AssetTypeSchema)),
  reward_xp: number().int().nonnegative().default(0),
  reward_currency: RewardCurrencySchema.default("btc"),
  reward_amount: number().int().nonnegative().default(0),
  child_quest_id: optional(nullable(uuid())),
  eval_route_id: optional(nullable(uuid())),
  eval_score_path: optional(nullable(string())),
  eval_pass_min: optional(nullable(number())),
  eval_pass_max: optional(nullable(number())),
  submission_assets: optional(
    nullable(record(string(), QuestSubmissionAssetDeclarationSchema)),
  ),
  eval_static_inputs: optional(nullable(KeyedAssetRefsSchema)),
  notes: optional(nullable(string())),
  contributor_keys: optional(
    nullable(
      array(
        object({
          key: string(),
          required: zodBoolean().default(true),
          filters: object({
            assetType: optional(string()),
            fileType: optional(string()),
            extensions: optional(array(string())),
            hasConstraints: zodBoolean().default(false),
          }),
        }),
      ),
    ),
  ),
  created_at: string(),
  updated_at: string(),
});

const QuestItemSchema = QuestItemBaseSchema;

/**
 * Shape used by `POST /quests/create` (inline items) and
 * `POST /quests/:id/items` (batch add). The controller fills in
 * `quest_id`, `created_by`, and lifecycle-derived fields
 * (`auto_skipped`, `status_before_auto_skip`).
 *
 * Accepts a plain description string as a convenience — it's lifted
 * into `{ description }` by the `union` below.
 */
const CreateQuestItemObjectSchema = object({
  description: string().min(1, { message: "Item description cannot be empty" }),
  type: optional(string()).default("task"),
  sort_order: optional(number().int()),
  assignee_id: optional(nullable(uuid())),
  expected_asset_type: optional(nullable(AssetTypeSchema)),
  reward_xp: optional(number().int().nonnegative()).default(0),
  reward_currency: optional(RewardCurrencySchema).default("btc"),
  // Amount is in minor units of `reward_currency`: sats for BTC, cents
  // for USD. Both fit in JS numbers comfortably for our reward sizes;
  // the underlying column is `bigint`.
  reward_amount: optional(number().int().nonnegative()).default(0),
  child_quest_id: optional(nullable(uuid())),
  eval_route_id: optional(nullable(uuid())),
  eval_score_path: optional(nullable(string())),
  eval_pass_min: optional(nullable(number())),
  eval_pass_max: optional(nullable(number())),
  submission_assets: optional(
    nullable(record(string(), QuestSubmissionAssetDeclarationSchema)),
  ),
  eval_static_inputs: optional(nullable(KeyedAssetRefsSchema)),
  notes: optional(nullable(string())),
});

const CreateQuestItemSchema = union([
  string().transform((s) => ({ description: s })),
  CreateQuestItemObjectSchema,
]).pipe(CreateQuestItemObjectSchema);

// ── Quest ──────────────────────────────────────────────────────────────

const QuestSpecificsSchema = object({
  type: QuestTypeSchema.default("closable"),
  status: QuestStatusSchema.default("open"),
  max_xp_per_contributor: optional(nullable(number().int().nonnegative())),
  closed_at: optional(nullable(string())),
});

const QuestSchema = AssetSchema.extend({
  asset_type: literal("quest").default("quest"),
  metadata: optional(nullable(AssetMetadataSchema.partial())),
  // `read /quests/:id` returns the quest specifics nested under `quest`
  // and hoists items to the top level for convenience.
  quest: optional(QuestSpecificsSchema.partial()),
  items: optional(array(QuestItemSchema.partial())),
  progress: optional(
    object({
      total: number(),
      done: number(),
      remaining: number(),
    }),
  ),
});

/**
 * Schema used by the backend controller and SDK clients to validate /
 * default the body of `POST /quests/create`. Mirrors how
 * `CreatePostSchema` defaults `org_id`/`team_id` so non-frontend callers
 * don't have to know about `GLOBAL_ORG_ID`.
 *
 * The `items` field accepts either plain strings or full item objects —
 * the backend `createQuestItems`/`createQuest` paths already handle both
 * shapes, and `CreateQuestItemSchema` normalizes strings into
 * `{ description }`.
 */
const CreateQuestSchema = CreateAssetSchema.extend({
  asset_type: literal("quest").default("quest"),
  name: optional(nullable(string())).default(null),
  description: optional(nullable(ContentSchema)),
  type: QuestTypeSchema.default("closable"),
  status: QuestStatusSchema.default("open"),
  max_xp_per_contributor: optional(nullable(number().int().nonnegative())),
  items: optional(array(CreateQuestItemSchema)).default([]),
}).transform((value) => normalizeAssetConfigForParsing(value));

const UpdateQuestSchema = QuestSchema.partial()
  .omit({
    user_id: true,
    id: true,
    created_at: true,
    last_updated: true,
    organization: true,
    user: true,
    team: true,
    slug: true,
    items: true,
    progress: true,
  })
  .extend({
    asset_type: literal("quest").default("quest"),
    last_updated: string().default(() => new Date().toISOString()),
  })
  .transform((value) => normalizeAssetConfigForParsing(value));

const UpdateQuestItemSchema = CreateQuestItemObjectSchema.partial().extend({
  status: optional(QuestItemStatusSchema),
});

// ── Entries ────────────────────────────────────────────────────────────

const EntrySchema = object({
  id: uuid(),
  quest_id: uuid(),
  user_id: uuid(),
  item_id: optional(nullable(uuid())),
  asset_id: optional(nullable(uuid())),
  asset_type: optional(nullable(AssetTypeSchema)),
  assets: optional(nullable(KeyedAssetRefsSchema)),
  description: optional(nullable(ContentSchema)),
  review: optional(nullable(ContentSchema)),
  status: EntryStatusSchema,
  reviewer_id: optional(nullable(uuid())),
  reviewed_at: optional(nullable(string())),
  eval_action_id: optional(nullable(uuid())),
  eval_score: optional(nullable(number())),
  eval_status: optional(nullable(EntryEvalStatusSchema)),
  created_at: string(),
  updated_at: string(),
});

const CreateEntrySchema = object({
  item_id: uuid(),
  assets: optional(nullable(KeyedAssetInputSchema)),
  description: optional(nullable(union([string(), ContentSchema]))),
});

const ReviewEntrySchema = object({
  status: zodEnum(["accepted", "rejected"]),
  review: optional(nullable(union([string(), ContentSchema]))),
});

// ── Exports ────────────────────────────────────────────────────────────

export {
  KeyedAssetRefsSchema,
  KeyedAssetInputSchema,
  QuestSubmissionAssetDeclarationSchema,
  QuestTypeSchema,
  QuestStatusSchema,
  QuestItemStatusSchema,
  RewardCurrencySchema,
  EntryEvalStatusSchema,
  EntryStatusSchema,
  QuestSchema,
  QuestItemSchema,
  QuestItemBaseSchema,
  CreateQuestSchema,
  CreateQuestItemSchema,
  CreateQuestItemObjectSchema,
  UpdateQuestSchema,
  UpdateQuestItemSchema,
  EntrySchema,
  CreateEntrySchema,
  ReviewEntrySchema,
};

export type QuestType = z.infer<typeof QuestTypeSchema>;
export type QuestStatus = z.infer<typeof QuestStatusSchema>;
export type QuestItemStatus = z.infer<typeof QuestItemStatusSchema>;
export type RewardCurrency = z.infer<typeof RewardCurrencySchema>;
export type EntryEvalStatus = z.infer<typeof EntryEvalStatusSchema>;
export type EntryStatus = z.infer<typeof EntryStatusSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type QuestItem = z.infer<typeof QuestItemSchema>;
export type CreateQuest = z.infer<typeof CreateQuestSchema>;
export type CreateQuestItem = z.infer<typeof CreateQuestItemSchema>;
export type UpdateQuest = z.infer<typeof UpdateQuestSchema>;
export type UpdateQuestItem = z.infer<typeof UpdateQuestItemSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type CreateEntry = z.infer<typeof CreateEntrySchema>;
export type ReviewEntry = z.infer<typeof ReviewEntrySchema>;
