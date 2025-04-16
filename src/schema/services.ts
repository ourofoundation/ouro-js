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

import { VisibilitySchema } from "./common";
import { AssetSchema } from "./assets";

const authType = zodEnum(["Personal Access Token", "None", "OAuth 2.0"]);

const serviceSchema = object({
  id: string(),
  user_id: string(),
  org_id: optional(nullable(string())),
  name: string(),
  description: optional(nullable(string())),
  visibility: VisibilitySchema,
  version: optional(nullable(string())),
  authentication: authType,
  base_url: string(),
  spec_path: string(),
  created_at: string(),
  last_updated: string(),
});

const routeSchema = object({
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
  security: optional(nullable(record(string(), any()))),
  rate_limit: optional(nullable(number())),
  last_updated: string(),
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
  status: zodEnum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  created_at: string(),
  last_updated: string(),
  started_at: optional(nullable(string())),
  finished_at: optional(nullable(string())),
});

export { routeSchema, serviceSchema, authType, ActionSchema };
export type Service = z.infer<typeof serviceSchema>;
export type Route = z.infer<typeof routeSchema>;
export type AuthType = z.infer<typeof authType>;
export type Action = z.infer<typeof ActionSchema>;
