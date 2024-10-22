import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { AssetSchema } from "./assets";
import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";

const ReplicationSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((val) => val === "replication"),
});

const CreateReplicationSchema = ReplicationSchema.partial().extend({
  id: z
    .string()
    .uuid()
    .default(() => uuidv7()),
  team_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
  org_id: z.string().uuid().default("00000000-0000-0000-0000-000000000000"),
  name_url_slug: z.string(),
  metadata: z
    .object({
      edges: z.array(z.object({}).passthrough()),
      nodes: z.array(z.object({}).passthrough()),
    })
    .passthrough(),
});

const UpdateReplicationSchema = z.object({
  team_id: z.string().uuid().nullable().optional(),
  name_url_slug: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  visibility: VisibilitySchema.nullable().optional(),
  metadata: z.object({}).passthrough().optional().nullable(),
  last_updated: z.string().default(() => new Date().toISOString()),
});

type Replication = z.infer<typeof ReplicationSchema>;
type CreateReplication = z.infer<typeof CreateReplicationSchema>;
type UpdateReplication = z.infer<typeof UpdateReplicationSchema>;

export {
  ReplicationSchema,
  CreateReplicationSchema,
  UpdateReplicationSchema,
  type Replication,
  type CreateReplication,
  type UpdateReplication,
};
