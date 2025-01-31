import { z } from "zod";

const AssetTypeSchema = z.enum([
  "user",
  "organization",
  "team",
  "dataset",
  "file",
  "service",
  "route",
  "post",
  "comment",
  "conversation",
  "blueprint",
  "replication",
]);

const VisibilitySchema = z.enum([
  "public",
  "private",
  "organization",
  "monetized",
  "inherit",
]);

const RoleSchema = z.enum(["admin", "read", "write", "none"]);

const MonetizationSchema = z.enum(["none", "pay-to-unlock", "pay-per-use"]);

const EmbeddingSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  org_id: z.string().nullable().optional(),
  embedding: z.array(z.number()),
  content: z.string(),
  asset_type: AssetTypeSchema,
  asset_id: z.string(),
  metadata: z.object({}).passthrough().nullable().optional(),
  created_at: z.string(),
  last_updated: z.string(),
});

const ConnectionTypeSchema = z.enum([
  "comment",
  "reference",
  "mention",
  "action",
  "component",
]);

const ConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: ConnectionTypeSchema,
  action_id: z.string().uuid().optional().nullable(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  source_asset_type: AssetTypeSchema,
  target_asset_type: AssetTypeSchema,
  created_at: z.string(),
  last_updated: z.string(),
});

const PurchaseAssetSchema = z.object({
  assetId: z.string().uuid(),
  method: z.enum(["checkout", "api"]),
  assetType: AssetTypeSchema,
});

const PermissionSchema = z.object({
  id: z.string().uuid(),
  role: RoleSchema,
  user: z.object({
    user_id: z.string().uuid(),
  }),
  user_id: z.string().uuid().nullable(),
  org_id: z.string().uuid().nullable(),
  asset_type: AssetTypeSchema,
  asset_id: z.string().uuid(),
  created_at: z.string(),
  last_updated: z.string(),
});

const StatusSchema = z.enum(["queued", "in-progress", "success", "error"]);

export {
  RoleSchema,
  VisibilitySchema,
  MonetizationSchema,
  ConnectionSchema,
  EmbeddingSchema,
  AssetTypeSchema,
  PurchaseAssetSchema,
  PermissionSchema,
  StatusSchema,
};

export type Role = z.infer<typeof RoleSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type Visibility = z.infer<typeof VisibilitySchema>;
export type Monetization = z.infer<typeof MonetizationSchema>;
export type AssetTypes = z.infer<typeof AssetTypeSchema>;
export type PurchaseAsset = z.infer<typeof PurchaseAssetSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type Status = z.infer<typeof StatusSchema>;
