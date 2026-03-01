import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  uuid,
  array,
  type z,
  record,
  any,
  nullable
} from "zod";

import {
  AssetMetadataSchema,
  AssetSchema,
  normalizeAssetConfigForParsing,
} from "./assets";
import {
  AssetTypeSchema,
  MonetizationSchema,
  VisibilitySchema,
} from "./common";
import { GLOBAL_ORG_ID, GLOBAL_TEAM_ID } from "./constants";

const BaseBlueprintMetadataSchema = object({
  edges: array(record(string(), any())),
  nodes: array(record(string(), any())),
});

const BlueprintMetadataSchema = BaseBlueprintMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const BlueprintSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((val) => val === "blueprint"),
  metadata: BlueprintMetadataSchema,
});

const CreateBlueprintSchema = AssetSchema.partial().extend({
  id: uuid().default(() => uuidv7()),
  team_id: uuid().default(GLOBAL_TEAM_ID),
  org_id: uuid().default(GLOBAL_ORG_ID),
  name_url_slug: string(),
  metadata: BlueprintMetadataSchema.passthrough(),
}).transform((value) => normalizeAssetConfigForParsing(value));

const UpdateBlueprintSchema = object({
  team_id: nullable(uuid()),
  name_url_slug: nullable(string()),
  name: nullable(string()),
  description: nullable(string()),
  visibility: nullable(VisibilitySchema),
  metadata: nullable(record(string(), any())),
  last_updated: string().default(() => new Date().toISOString()),
}).transform((value) => normalizeAssetConfigForParsing(value));

export { BlueprintSchema, CreateBlueprintSchema, UpdateBlueprintSchema };
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type CreateBlueprint = z.infer<typeof CreateBlueprintSchema>;
export type UpdateBlueprint = z.infer<typeof UpdateBlueprintSchema>;
