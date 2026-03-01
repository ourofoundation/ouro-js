import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  uuid,
  type z,
  record,
  any,
  optional,
  nullable
} from "zod";

import {
  AssetMetadataSchema,
  AssetSchema,
  normalizeAssetConfigForParsing,
} from "./assets";
import { AssetTypeSchema, VisibilitySchema } from "./common";
import { GLOBAL_ORG_ID, GLOBAL_TEAM_ID } from "./constants";

const BaseReplicationMetadataSchema = object({
  schedule: optional(
    object({
      cron: string(),
    }).passthrough()
  ),
});

const ReplicationMetadataSchema = BaseReplicationMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const ReplicationSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((val) => val === "replication"),
  metadata: ReplicationMetadataSchema,
});

const CreateReplicationSchema = ReplicationSchema.partial().extend({
  id: uuid().default(() => uuidv7()),
  team_id: uuid().default(GLOBAL_TEAM_ID),
  org_id: uuid().default(GLOBAL_ORG_ID),
  name_url_slug: string(),
}).transform((value) => normalizeAssetConfigForParsing(value));

const UpdateReplicationSchema = object({
  team_id: optional(nullable(uuid())),
  name_url_slug: optional(nullable(string())),
  name: optional(nullable(string())),
  description: optional(nullable(string())),
  visibility: optional(nullable(VisibilitySchema)),
  metadata: optional(nullable(record(string(), any()))),
  last_updated: string().default(() => new Date().toISOString()),
}).transform((value) => normalizeAssetConfigForParsing(value));

export { ReplicationSchema, CreateReplicationSchema, UpdateReplicationSchema };
export type Replication = z.infer<typeof ReplicationSchema>;
export type CreateReplication = z.infer<typeof CreateReplicationSchema>;
export type UpdateReplication = z.infer<typeof UpdateReplicationSchema>;

