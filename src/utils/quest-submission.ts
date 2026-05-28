import {
  object,
  string,
  record,
  optional,
  boolean,
  array,
  uuid,
  union,
  type z,
} from "zod";

import { AssetTypeSchema } from "../schema/common";
import { RouteInputAssetDeclarationSchema } from "../schema/services";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeFileExtension(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/^\.+/, "").trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]/g, "");
  if (!safe || /^\d+$/.test(safe) || safe.length > 12) return null;
  return safe;
}

function normalizeFileExtensions(
  value: string | string[] | null | undefined
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/)
      : [];
  return Array.from(
    new Set(
      rawValues
        .map((entry) => normalizeFileExtension(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );
}

/** Stored on entries and eval_static_inputs after server normalization. */
export const KeyedAssetRefsSchema = record(
  string(),
  object({
    asset_id: uuid(),
    asset_type: AssetTypeSchema,
  })
);

/** Accepted on POST /quests/:id/entries/create — server fills asset_type. */
export const KeyedAssetInputValueSchema = union([
  uuid(),
  object({
    asset_id: uuid(),
    asset_type: optional(AssetTypeSchema),
  }),
]);

export const KeyedAssetInputSchema = record(
  string(),
  KeyedAssetInputValueSchema
);

export const QuestSubmissionAssetDeclarationSchema =
  RouteInputAssetDeclarationSchema.extend({
    required: optional(boolean()).default(true),
  });

export type KeyedAssetRefs = z.infer<typeof KeyedAssetRefsSchema>;
export type KeyedAssetInput = z.infer<typeof KeyedAssetInputSchema>;
export type QuestSubmissionAssetDeclaration = z.infer<
  typeof QuestSubmissionAssetDeclarationSchema
>;

export type AssetDeclarationPickerFilters = {
  assetType?: string;
  fileType?: string;
  extensions?: string[];
  hasConstraints: boolean;
};

export type QuestSubmissionItemInput = {
  eval_route_id?: string | null;
  submission_assets?: Record<string, QuestSubmissionAssetDeclaration> | null;
  eval_static_inputs?: KeyedAssetRefs | null;
  expected_asset_type?: string | null;
};

export type RouteInputDeclarationLike = {
  asset_type?: string | null;
  primary?: boolean;
  input_filter?: string | null;
  filter?: string | null;
  file_extensions?: string[] | null;
  input_file_extensions?: string[] | null;
};

export type RouteForSubmissionShape = {
  route?: {
    input_assets?: Record<string, RouteInputDeclarationLike> | null;
    input_type?: string | null;
    input_filter?: string | null;
    input_file_extensions?: string[] | null;
  } | null;
} | null;

function readDeclarationExtensions(
  declaration: RouteInputDeclarationLike
): string[] {
  return normalizeFileExtensions([
    ...(Array.isArray(declaration.file_extensions)
      ? declaration.file_extensions
      : []),
    ...(Array.isArray(declaration.input_file_extensions)
      ? declaration.input_file_extensions
      : []),
  ].join(","));
}

function readDeclarationFilter(
  declaration: RouteInputDeclarationLike
): string | undefined {
  return declaration.input_filter || declaration.filter || undefined;
}

/** Route keyed inputs as a flat map (includes legacy input_type fallback). */
export function getRouteInputDeclarationsFromRoute(
  route: RouteForSubmissionShape
): Record<string, RouteInputDeclarationLike> {
  const detail = route?.route;
  if (!detail) return {};

  const inputs = detail.input_assets;
  if (isPlainObject(inputs)) {
    const entries = Object.entries(inputs).filter(([, value]) =>
      isPlainObject(value)
    ) as [string, RouteInputDeclarationLike][];
    if (entries.length > 0) {
      return Object.fromEntries(entries);
    }
  }

  if (detail.input_type) {
    return {
      [detail.input_type]: {
        asset_type: detail.input_type,
        primary: true,
        input_filter: detail.input_filter,
        input_file_extensions: detail.input_file_extensions ?? null,
      },
    };
  }

  return {};
}

export function declarationToSubmissionDeclaration(
  declaration: RouteInputDeclarationLike
): QuestSubmissionAssetDeclaration {
  const extensions = readDeclarationExtensions(declaration);
  const filter = readDeclarationFilter(declaration);
  return {
    asset_type: declaration.asset_type as QuestSubmissionAssetDeclaration["asset_type"],
    primary: declaration.primary,
    input_filter: (filter ?? null) as QuestSubmissionAssetDeclaration["input_filter"],
    file_extensions: extensions.length > 0 ? extensions : null,
    required: true,
  };
}

/** Materialize contributor declarations from route inputs minus pinned keys. */
export function materializeContributorSubmissionAssets(
  routeInputs: Record<string, RouteInputDeclarationLike>,
  pinnedKeys: string[]
): Record<string, QuestSubmissionAssetDeclaration> {
  const pinned = new Set(pinnedKeys);
  const out: Record<string, QuestSubmissionAssetDeclaration> = {};
  for (const [key, declaration] of Object.entries(routeInputs)) {
    if (pinned.has(key)) continue;
    out[key] = declarationToSubmissionDeclaration(declaration);
  }
  return out;
}

export function getPrimaryDeclarationKey(
  declarations: Record<string, QuestSubmissionAssetDeclaration>
): string | null {
  const entries = Object.entries(declarations);
  if (!entries.length) return null;
  const primary = entries.find(([, d]) => d.primary === true);
  if (primary) return primary[0];
  if (entries.length === 1) return entries[0][0];
  return entries[0][0];
}

export function getSubmissionAssetShape(
  item: QuestSubmissionItemInput,
  route?: RouteForSubmissionShape | null
): {
  contributorKeys: string[];
  declarations: Record<string, QuestSubmissionAssetDeclaration>;
  pinned: KeyedAssetRefs;
} {
  const pinned: KeyedAssetRefs = item.eval_static_inputs ?? {};

  if (item.eval_route_id && route) {
    const routeInputs = getRouteInputDeclarationsFromRoute(route);
    const pinnedKeys = Object.keys(pinned);
    const materialized =
      item.submission_assets &&
      Object.keys(item.submission_assets).length > 0
        ? item.submission_assets
        : materializeContributorSubmissionAssets(routeInputs, pinnedKeys);
    const contributorKeys = Object.keys(materialized);
    return {
      contributorKeys,
      declarations: materialized,
      pinned,
    };
  }

  const declarations = item.submission_assets ?? {};
  return {
    contributorKeys: Object.keys(declarations),
    declarations,
    pinned,
  };
}

export function declarationToPickerFilters(
  declaration: RouteInputDeclarationLike | QuestSubmissionAssetDeclaration | null | undefined
): AssetDeclarationPickerFilters | null {
  if (!declaration) return null;
  const assetType = declaration.asset_type || undefined;
  if (!assetType) return null;

  const filters: AssetDeclarationPickerFilters = {
    assetType,
    hasConstraints: false,
  };

  if (assetType === "file") {
    const extensions = readDeclarationExtensions(declaration);
    if (extensions.length > 0) {
      filters.extensions = extensions;
      filters.hasConstraints = true;
    }
    const fileType = readDeclarationFilter(declaration);
    if (fileType) {
      filters.fileType = fileType;
      filters.hasConstraints = true;
    }
  }

  return filters;
}

export function assetMatchesDeclaration(
  asset:
    | {
        assetType?: string | null;
        asset_type?: string | null;
        asset?: { metadata?: Record<string, unknown> } | null;
      }
    | null
    | undefined,
  declaration: RouteInputDeclarationLike | QuestSubmissionAssetDeclaration | null | undefined
): boolean {
  if (!declaration || !asset) return true;
  const filters = declarationToPickerFilters(declaration);
  if (!filters) return true;

  const assetType = asset.assetType ?? asset.asset_type;
  if (filters.assetType && assetType !== filters.assetType) return false;

  if (filters.assetType === "file") {
    const metadata = asset.asset?.metadata ?? {};
    if (filters.extensions && filters.extensions.length > 0) {
      const ext = String(metadata.extension ?? "").toLowerCase();
      if (!ext || !filters.extensions.includes(ext)) return false;
    }
    if (filters.fileType) {
      const type = String(metadata.file_type ?? metadata.type ?? "")
        .toLowerCase()
        .split("/")[0];
      const expected = filters.fileType.toLowerCase();
      if (type && expected && !type.includes(expected) && type !== expected) {
        return false;
      }
    }
  }

  return true;
}

export function getPrimaryAssetRef(
  refs: KeyedAssetRefs | null | undefined,
  declarations?: Record<string, QuestSubmissionAssetDeclaration> | null
): { key: string; asset_id: string; asset_type: string } | null {
  if (!refs || !Object.keys(refs).length) return null;
  const key =
    (declarations && getPrimaryDeclarationKey(declarations)) ||
    Object.keys(refs)[0];
  const ref = refs[key];
  if (!ref) return null;
  return { key, asset_id: ref.asset_id, asset_type: ref.asset_type };
}

export function toRouteInputAssets(
  refs: KeyedAssetRefs | null | undefined
): Record<string, { assetId: string; assetType: string }> {
  if (!refs) return {};
  return Object.fromEntries(
    Object.entries(refs).map(([key, ref]) => [
      key,
      { assetId: ref.asset_id, assetType: ref.asset_type },
    ])
  );
}

/** @deprecated Use declarationToPickerFilters */
export type EvalSubmissionFilters = AssetDeclarationPickerFilters;
