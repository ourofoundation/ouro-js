import {
  object,
  string,
  number,
  array,
  enum as zodEnum,
  nullable,
  optional,
  type z,
  uuid,
} from "zod";

// Tag types (what kind of tag is this)
const TagTypeSchema = zodEnum([
  "domain",    // Scientific domain (materials, chemistry, biology)
  "modality",  // Data modality (3D, video, image, audio, text, tabular)
  "task",      // Task/use case (crystal structure prediction, summarization)
  "intent",    // Social/purpose (bounty, rfc, showcase)
  "property",  // Scientific property (band-gap, toxicity)
  "scale",     // Physical scale (atomic, macro, galactic)
  "other",     // General/miscellaneous
]);

// Tag source (how the tag was assigned)
const TagSourceSchema = zodEnum(["manual", "auto"]);

// Tag schema
const TagSchema = object({
  id: uuid(),
  name: string(),
  slug: string(),
  description: optional(nullable(string())),
  image_url: optional(nullable(string())),
  parent_id: optional(nullable(uuid())),
  type: TagTypeSchema,
  asset_types: array(string()), // Array of asset type strings
  rank: number().int().default(0),
  created_at: string(),
  last_updated: string(),
});

// Tag with parent included (for nested display)
const TagWithParentSchema = TagSchema.extend({
  parent: optional(nullable(TagSchema)),
});

// Asset tag join (relationship between asset and tag)
const AssetTagSchema = object({
  id: uuid(),
  asset_id: uuid(),
  tag_id: uuid(),
  source: TagSourceSchema,
  confidence: optional(nullable(number().min(0).max(1))), // 0.00 to 1.00
  user_id: optional(nullable(uuid())),
  created_at: string(),
});

// Asset tag with full tag data included
const AssetTagWithTagSchema = AssetTagSchema.extend({
  tag: TagSchema,
});

// For creating a new asset tag
const CreateAssetTagSchema = object({
  asset_id: uuid(),
  tag_id: uuid(),
  source: TagSourceSchema.default("manual"),
  confidence: optional(nullable(number().min(0).max(1))),
});

// Grouped tags by type (for discovery UI)
const TagsByTypeSchema = object({
  type: TagTypeSchema,
  tags: array(TagSchema),
});

export {
  TagTypeSchema,
  TagSourceSchema,
  TagSchema,
  TagWithParentSchema,
  AssetTagSchema,
  AssetTagWithTagSchema,
  CreateAssetTagSchema,
  TagsByTypeSchema,
};

export type TagType = z.infer<typeof TagTypeSchema>;
export type TagSource = z.infer<typeof TagSourceSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type TagWithParent = z.infer<typeof TagWithParentSchema>;
export type AssetTag = z.infer<typeof AssetTagSchema>;
export type AssetTagWithTag = z.infer<typeof AssetTagWithTagSchema>;
export type CreateAssetTag = z.infer<typeof CreateAssetTagSchema>;
export type TagsByType = z.infer<typeof TagsByTypeSchema>;
