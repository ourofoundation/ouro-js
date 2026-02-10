import {
  object,
  string,
  number,
  array,
  enum as zodEnum,
  type z,
  any,
  nullable,
  optional,
  record
} from "zod";

const AssetTypeSchema = zodEnum([
  "user",
  "organization",
  "team",
  "dataset",
  "file",
  "service",
  "route",
  "post",
  "quest",
  "comment",
  "conversation",
  "blueprint",
  "replication",
]);

const VisibilitySchema = zodEnum([
  "public",
  "private",
  "organization",
  "monetized",
  "inherit",
]);

const RoleSchema = zodEnum(["admin", "read", "write", "none"]);

const MonetizationSchema = zodEnum(["none", "pay-to-unlock", "pay-per-use"]);

const PriceCurrencySchema = zodEnum(["usd", "btc"]);

const EmbeddingSchema = object({
  id: string(),
  user_id: string(),
  org_id: optional(nullable(string())),
  embedding: array(number()),
  content: string(),
  asset_type: AssetTypeSchema,
  asset_id: string(),
  metadata: optional(nullable(record(string(), any()))),
  created_at: string(),
  last_updated: string(),
});

const ConnectionTypeSchema = zodEnum([
  "comment",
  "reference",
  "mention",
  "action",
  "component",
]);

const ConnectionSchema = object({
  id: string().uuid(),
  user_id: string().uuid(),
  type: ConnectionTypeSchema,
  action_id: optional(nullable(string().uuid())),
  source_id: string().uuid(),
  target_id: string().uuid(),
  source_asset_type: AssetTypeSchema,
  target_asset_type: AssetTypeSchema,
  created_at: string(),
  last_updated: string(),
});

const PurchaseAssetSchema = object({
  assetId: string().uuid(),
  method: zodEnum(["checkout", "api"]),
  assetType: AssetTypeSchema,
});

const PermissionSchema = object({
  id: string().uuid(),
  role: RoleSchema,
  user: object({
    user_id: string().uuid(),
  }),
  user_id: nullable(string().uuid()),
  org_id: nullable(string().uuid()),
  asset_type: AssetTypeSchema,
  asset_id: string().uuid(),
  created_at: string(),
  last_updated: string(),
});

const StatusSchema = zodEnum(["queued", "in-progress", "success", "error"]);

const SourceSchema = zodEnum(["web", "api"]);

export {
  RoleSchema,
  VisibilitySchema,
  MonetizationSchema,
  PriceCurrencySchema,
  ConnectionSchema,
  EmbeddingSchema,
  AssetTypeSchema,
  PurchaseAssetSchema,
  PermissionSchema,
  StatusSchema,
  SourceSchema,
};

export type Role = z.infer<typeof RoleSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type Visibility = z.infer<typeof VisibilitySchema>;
export type Monetization = z.infer<typeof MonetizationSchema>;
export type PriceCurrency = z.infer<typeof PriceCurrencySchema>;
export type AssetTypes = z.infer<typeof AssetTypeSchema>;
export type PurchaseAsset = z.infer<typeof PurchaseAssetSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Source = z.infer<typeof SourceSchema>;
