import {
  object,
  string,
  uuid,
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

import { AssetTypeSchema, StatusSchema } from "./common";
import {
  AssetMetadataSchema,
  AssetSchema,
  CreateAssetSchema,
  normalizeAssetConfigForParsing,
} from "./assets";

const AuthType = zodEnum(["Personal Access Token", "Ouro", "None", "OAuth 2.0"]);

const BaseServiceMetadataSchema = object({
  authentication: AuthType,
  base_url: string(),
  version: optional(nullable(string())),
  spec_path: optional(nullable(string())),
  spec_url: optional(nullable(string())),
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
}).transform((value) => normalizeAssetConfigForParsing(value));

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
  })
  .transform((value) => normalizeAssetConfigForParsing(value));

const ExecutionModeSchema = zodEnum(["sync", "async"]);

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
  input_assets: optional(nullable(record(string(), any()))),
  input_type: optional(nullable(zodEnum(["file", "dataset", "post"]))),
  input_filter: optional(nullable(zodEnum(["audio", "video", "image", "pdf", "3d model", "atomic structure"]))),
  input_file_extension: optional(nullable(string())),
  input_file_extensions: optional(nullable(array(string()))),
  output_type: optional(nullable(zodEnum(["file", "dataset", "post"]))),
  output_assets: optional(nullable(record(string(), any()))),
  output_file_extension: optional(nullable(string())),
  security: optional(nullable(record(string(), any()))),
  rate_limit: optional(nullable(number())),
  // Author-declared execution model: 'sync' = upstream returns the result
  // inline; 'async' = upstream returns 202 quickly and webhooks completion.
  execution_mode: optional(ExecutionModeSchema).default("sync"),
  // Empirical mode derived by the platform from recent action history; null
  // until enough samples have been observed. When this differs from
  // execution_mode the route is misconfigured.
  observed_execution_mode: optional(nullable(ExecutionModeSchema)),
  last_updated: string(),
});

// Per-route latency aggregates surfaced from asset_metrics. All fields are
// nullable because they don't exist until the platform has observed at least
// one completed action for the route.
const RouteMetricsSchema = object({
  // Average HTTP-hop latency in milliseconds: time from request start until
  // upstream returned 200 or 202.
  avg_ack_ms: optional(nullable(number())),
  p95_ack_ms: optional(nullable(number())),
  // Average end-to-end latency in milliseconds: started_at to finished_at,
  // includes webhook completion for async routes. This is the value an
  // agent should consider when deciding whether to wait or poll.
  avg_completion_ms: optional(nullable(number())),
  p95_completion_ms: optional(nullable(number())),
  latency_sample_count: optional(nullable(number())),
});

const RouteSchema = AssetSchema.extend({
  asset_type: AssetTypeSchema.refine((x) => "route" === x),
  route: RouteDetailSchema,
  // Latency aggregates joined from asset_metrics; null when no samples yet.
  metrics: optional(nullable(RouteMetricsSchema)),
});

const ActionSchema = object({
  id: uuid(),
  user_id: uuid(),
  route_id: uuid(),
  metadata: optional(nullable(record(string(), any()))),
  response: optional(nullable(record(string(), any()))),
  side_effects: boolean().default(true),
  input_asset_id: optional(nullable(uuid())),
  output_asset_id: optional(nullable(uuid())),
  input_asset: optional(nullable(AssetSchema)),
  input_assets: optional(nullable(array(record(string(), any())))),
  output_asset: optional(nullable(AssetSchema)),
  output_assets: optional(nullable(array(record(string(), any())))),
  webhook_url: optional(nullable(string())),
  webhook_token: optional(nullable(string())),
  status: StatusSchema,
  created_at: string(),
  last_updated: string(),
  started_at: optional(nullable(string())),
  // When the upstream service first responded (200 or 202). For sync routes
  // this is approximately equal to finished_at; for async routes the gap
  // between ack_at and finished_at is the out-of-band wait time.
  ack_at: optional(nullable(string())),
  // HTTP status code returned by the upstream service at ack time.
  upstream_status_code: optional(nullable(number())),
  finished_at: optional(nullable(string())),
});

export {
  RouteSchema,
  ServiceSchema,
  CreateServiceSchema,
  UpdateServiceSchema,
  ActionSchema,
  RouteMetricsSchema,
  ExecutionModeSchema,
};
export type Service = z.infer<typeof ServiceSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteDetail = z.infer<typeof RouteDetailSchema>;
export type RouteMetrics = z.infer<typeof RouteMetricsSchema>;
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;
export type AuthType = z.infer<typeof AuthType>;
export type Action = z.infer<typeof ActionSchema>;
