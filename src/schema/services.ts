import {
  object,
  string,
  number,
  array,
  type z,
  record,
  any,
  enum as zodEnum,
  optional,
  nullable,
  boolean
} from "zod";

import { AssetTypeSchema } from "./common";
import { AssetMetadataSchema, AssetSchema, CreateAssetSchema } from "./assets";

const AuthType = zodEnum(["Personal Access Token", "Ouro", "None", "OAuth 2.0"]);

const BaseServiceMetadataSchema = object({
  authentication: AuthType,
  base_url: string(),
  version: optional(nullable(string())),
  spec_path: optional(nullable(string())),
  spec_url: optional(nullable(string())),
  auth_token: optional(nullable(string())),
  auth_url: optional(nullable(string())),
});

const ServiceMetadataSchema = BaseServiceMetadataSchema.extend(
  AssetMetadataSchema.partial().shape
);

const ServiceSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((x) => "service" === x),
  metadata: ServiceMetadataSchema,
});

const CreateServiceSchema = CreateAssetSchema.extend({
  asset_type: AssetTypeSchema.refine((x) => "service" === x),
  metadata: ServiceMetadataSchema,
});

const UpdateServiceSchema = ServiceSchema.partial()
  .omit({
    user_id: true,
    id: true,
    created_at: true,
    last_updated: true,
    organization: true,
    user: true,
    team: true,
    slug: true,
  })
  .extend({
    last_updated: string().default(() => new Date().toISOString()),
  });

const RouteDetailSchema = object({
  id: string(),
  user_id: string(),
  service_id: string(),
  path: string(),
  method: zodEnum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  summary: optional(nullable(string())),
  parameters: optional(nullable(array(record(string(), any())))),
  request_body: optional(nullable(record(string(), any()))),
  responses: optional(nullable(array(record(string(), any())))),
  input_type: optional(nullable(zodEnum(["file", "dataset", "post"]))),
  input_filter: optional(nullable(zodEnum(["audio", "video", "image", "pdf", "3d model", "atomic structure"]))),
  input_file_extension: optional(nullable(string())),
  output_type: optional(nullable(zodEnum(["file", "dataset", "post"]))),
  output_file_extension: optional(nullable(string())),
  security: optional(nullable(record(string(), any()))),
  rate_limit: optional(nullable(number())),
  last_updated: string(),
});

const RouteSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((x) => "route" === x),
  route: RouteDetailSchema,
});

const ActionSchema = object({
  id: string().uuid(),
  user_id: string().uuid(),
  route_id: string().uuid(),
  metadata: optional(nullable(record(string(), any()))),
  response: optional(nullable(record(string(), any()))),
  side_effects: boolean().default(true),
  input_asset_id: optional(nullable(string().uuid())),
  output_asset_id: optional(nullable(string().uuid())),
  input_asset: optional(nullable(AssetSchema)),
  output_asset: optional(nullable(AssetSchema)),
  status: zodEnum(["queued", "in-progress", "success", "error", 'done']),
  created_at: string(),
  last_updated: string(),
  started_at: optional(nullable(string())),
  finished_at: optional(nullable(string())),
});

export { RouteSchema, ServiceSchema, CreateServiceSchema, UpdateServiceSchema, ActionSchema };
export type Service = z.infer<typeof ServiceSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteDetail = z.infer<typeof RouteDetailSchema>;
export type AuthType = z.infer<typeof AuthType>;
export type Action = z.infer<typeof ActionSchema>;
