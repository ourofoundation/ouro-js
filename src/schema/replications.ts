import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  type z,
  record,
  any,
  optional,
  nullable
} from "zod";

import { AssetMetadataSchema, AssetSchema } from "./assets";
import { AssetTypeSchema, VisibilitySchema } from "./common";

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
  id: string()
    .uuid()
    .default(() => uuidv7()),
  team_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
  org_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
  name_url_slug: string(),
});

const UpdateReplicationSchema = object({
  team_id: optional(nullable(string().uuid())),
  name_url_slug: optional(nullable(string())),
  name: optional(nullable(string())),
  description: optional(nullable(string())),
  visibility: optional(nullable(VisibilitySchema)),
  metadata: optional(nullable(record(string(), any()))),
  last_updated: string().default(() => new Date().toISOString()),
});

export { ReplicationSchema, CreateReplicationSchema, UpdateReplicationSchema };
export type Replication = z.infer<typeof ReplicationSchema>;
export type CreateReplication = z.infer<typeof CreateReplicationSchema>;
export type UpdateReplication = z.infer<typeof UpdateReplicationSchema>;

