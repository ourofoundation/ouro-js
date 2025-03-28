import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  array,
  type z,
  record,
  any,
  nullable
} from "zod";

import { AssetSchema } from "./assets";
import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";

const BlueprintSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((val) => val === "blueprint"),
});

const CreateBlueprintSchema = AssetSchema.partial().extend({
  id: string()
    .uuid()
    .default(() => uuidv7()),
  team_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
  org_id: string().uuid().default("00000000-0000-0000-0000-000000000000"),
  name_url_slug: string(),
  metadata: object({
    edges: array(record(string(), any())),
    nodes: array(record(string(), any())),
  }).passthrough(),
});

const UpdateBlueprintSchema = object({
  team_id: nullable(string().uuid()),
  name_url_slug: nullable(string()),
  name: nullable(string()),
  description: nullable(string()),
  visibility: nullable(VisibilitySchema),
  metadata: nullable(record(string(), any())),
  last_updated: string().default(() => new Date().toISOString()),
});

export { BlueprintSchema, CreateBlueprintSchema, UpdateBlueprintSchema };
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type CreateBlueprint = z.infer<typeof CreateBlueprintSchema>;
export type UpdateBlueprint = z.infer<typeof UpdateBlueprintSchema>;
