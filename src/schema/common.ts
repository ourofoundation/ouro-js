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
  role: RoleSchema,
  user: z.object({
    user_id: z.string().uuid(),
  }),
});

type Role = z.infer<typeof RoleSchema>;
type Connection = z.infer<typeof ConnectionSchema>;
type Embedding = z.infer<typeof EmbeddingSchema>;
type Visibility = z.infer<typeof VisibilitySchema>;
type Monetization = z.infer<typeof MonetizationSchema>;
type AssetTypes = z.infer<typeof AssetTypeSchema>;
type PurchaseAsset = z.infer<typeof PurchaseAssetSchema>;
type Permission = z.infer<typeof PermissionSchema>;

export {
  RoleSchema,
  VisibilitySchema,
  MonetizationSchema,
  ConnectionSchema,
  EmbeddingSchema,
  AssetTypeSchema,
  PurchaseAssetSchema,
  PermissionSchema,
  type Role,
  type Connection,
  type Embedding,
  type Visibility,
  type Monetization,
  type AssetTypes,
  type PurchaseAsset,
  type Permission,
};
