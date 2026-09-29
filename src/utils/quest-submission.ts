import {
  object,
  string,
  record,
  optional,
  boolean,
  array,
  uuid,
  union,
  type z,
} from "zod";

import { AssetTypeSchema } from "../schema/common";
import { RouteInputAssetDeclarationSchema } from "../schema/services";

/** Stored on entries and eval_static_inputs after server normalization. */
export const KeyedAssetRefsSchema = record(
  string(),
  object({
    asset_id: uuid(),
    asset_type: AssetTypeSchema,
  })
);

/** Accepted on POST /quests/:id/entries/create — server fills asset_type. */
export const KeyedAssetInputValueSchema = union([
  uuid(),
  object({
    asset_id: uuid(),
    asset_type: optional(AssetTypeSchema),
  }),
]);

export const KeyedAssetInputSchema = record(
  string(),
  KeyedAssetInputValueSchema
);

export const QuestSubmissionAssetDeclarationSchema =
  RouteInputAssetDeclarationSchema.extend({
    required: optional(boolean()).default(true),
  });

export type KeyedAssetRefs = z.infer<typeof KeyedAssetRefsSchema>;
export type KeyedAssetInput = z.infer<typeof KeyedAssetInputSchema>;
export type QuestSubmissionAssetDeclaration = z.infer<
  typeof QuestSubmissionAssetDeclarationSchema
>;

export * from "./quest-submission-helpers";
