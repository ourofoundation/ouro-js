import {
  any,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  nullable,
  number,
  object,
  optional,
  record,
  string,
  type z,
  uuid,
} from "zod";

import { ContentSchema } from "./posts";

const AssetRenditionKindSchema = zodEnum(["translation", "speech"]);
const AssetRenditionStatusSchema = zodEnum([
  "queued",
  "in-progress",
  "timed-out",
  "success",
  "error",
]);

const AssetRenditionBaseSchema = object({
  id: uuid(),
  asset_id: uuid(),
  route_id: uuid(),
  provider_id: uuid(),
  action_id: optional(nullable(uuid())),
  status: AssetRenditionStatusSchema,
  source_content_hash: optional(nullable(string())),
  configuration_hash: optional(nullable(string())),
  cache_scope: optional(zodEnum(["none", "user", "shared"])),
  cache_version: optional(nullable(string())),
  error: optional(nullable(any())),
  created_at: string(),
  last_updated: string(),
}).catchall(any());

const TranslationAssetRenditionSchema = AssetRenditionBaseSchema.extend({
  kind: literal("translation"),
  source_language: optional(nullable(string())),
  target_language: string(),
  content: optional(nullable(ContentSchema)),
});

const SpeechAudioSchema = object({
  storage_path: optional(nullable(string())),
  url: optional(nullable(string())),
  content_type: optional(nullable(string())),
  duration_seconds: optional(nullable(number())),
  byte_size: optional(nullable(number())),
}).catchall(any());

const SpeechAssetRenditionSchema = AssetRenditionBaseSchema.extend({
  kind: literal("speech"),
  language: string(),
  voice: optional(nullable(string())),
  audio: optional(nullable(SpeechAudioSchema)),
  metadata: optional(nullable(record(string(), any()))),
});

const AssetRenditionSchema = discriminatedUnion("kind", [
  TranslationAssetRenditionSchema,
  SpeechAssetRenditionSchema,
]);

export {
  AssetRenditionKindSchema,
  AssetRenditionStatusSchema,
  AssetRenditionBaseSchema,
  TranslationAssetRenditionSchema,
  SpeechAudioSchema,
  SpeechAssetRenditionSchema,
  AssetRenditionSchema,
};

export type AssetRenditionKind = z.infer<typeof AssetRenditionKindSchema>;
export type AssetRenditionStatus = z.infer<typeof AssetRenditionStatusSchema>;
export type AssetRenditionBase = z.infer<typeof AssetRenditionBaseSchema>;
export type TranslationAssetRendition = z.infer<
  typeof TranslationAssetRenditionSchema
>;
export type SpeechAudio = z.infer<typeof SpeechAudioSchema>;
export type SpeechAssetRendition = z.infer<typeof SpeechAssetRenditionSchema>;
export type AssetRendition = z.infer<typeof AssetRenditionSchema>;
