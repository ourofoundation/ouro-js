// Core schemas that are commonly used
export * from "./schema/common";
export * from "./schema/assets";

// Feature-specific schemas
export * from "./schema/users";
export * from "./schema/organizations";
export * from "./schema/teams";
export * from "./schema/files";
export * from "./schema/posts";
export * from "./schema/comments";
export * from "./schema/conversations";
export * from "./schema/datasets";
export * from "./schema/quests";
export * from "./schema/notifications";
export * from "./schema/events";
export * from "./schema/services";
export * from "./schema/reactions";
export * from "./schema/tags";

// Utils - exported individually for better tree-shaking
export { filterListToString } from "./utils/dataset";
export {
  FILE_FILTERS,
  fileTypes,
  getFileClassification,
  getFileFilterLabel,
  normalizeExtension,
  getExtensionFromFileName,
  getExtensionFromMimeType,
  getSafeFileExtension,
  type FileFilter,
} from "./utils/files";
export { getAssetUrl } from "./utils/navigate";
export { createUrlSlug } from "./utils/navigate";
export { createNameUrlSlug } from "./utils/navigate";
export { parseMarkdown } from "./utils/air/markdown-parser";
export {
  KeyedAssetRefsSchema,
  KeyedAssetInputSchema,
  QuestSubmissionAssetDeclarationSchema,
  getSubmissionAssetShape,
  materializeContributorSubmissionAssets,
  declarationToPickerFilters,
  assetMatchesDeclaration,
  getPrimaryAssetRef,
  getPrimaryDeclarationKey,
  toRouteInputAssets,
  getRouteInputDeclarationsFromRoute,
  declarationToSubmissionDeclaration,
  type KeyedAssetRefs,
  type KeyedAssetInput,
  type QuestSubmissionAssetDeclaration,
  type AssetDeclarationPickerFilters,
} from "./utils/quest-submission";
export {
  type ExtractedContentAsset,
  type DisplayConfig,
  type DataFilter,
  type InlineAssetAttrs,
  getReferencesInContent,
  parseAssetLinkShorthand,
  parseOuroAssetUrl,
  normalizeViewMode,
  resolveDisplayConfig,
} from "./utils/air";
