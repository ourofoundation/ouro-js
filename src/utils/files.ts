/** Canonical file-input filter values (route `input_filter`, discovery, etc.). */
const FILE_FILTERS = [
  "audio",
  "video",
  "image",
  "pdf",
  "3d model",
  "atomic structure",
] as const;

type FileFilter = (typeof FILE_FILTERS)[number];

/** MIME types grouped by file filter. */
const fileTypes: Record<FileFilter, readonly string[]> = {
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/x-aiff",
    "audio/midi",
    "audio/x-ms-wma",
    "audio/amr",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/avi",
    "video/mpeg",
    "video/quicktime",
    "video/x-ms-wmv",
    "video/x-flv",
  ],
  image: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/vnd.microsoft.icon",
  ],
  pdf: ["application/pdf"],
  "3d model": ["model/obj"],
  "atomic structure": [
    "chemical/x-cif",
    "chemical/x-pdb",
    "chemical/x-sdf",
    "chemical/x-mdl-sdfile",
    "chemical/x-mdl-molfile",
    "text/cif",
  ],
};

/** Short display labels for filter pills; keys are canonical filter values. */
const fileFilterAliases: Partial<Record<FileFilter, string>> = {
  "atomic structure": "atoms",
};

function getFileFilterLabel(fileType: string | null | undefined): string | null {
  if (!fileType) return null;
  return fileFilterAliases[fileType as FileFilter] ?? fileType;
}

function normalizeExtension(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/^\.+/, "").toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]/g, "");
  if (!safe) return null;
  if (/^\d+$/.test(safe)) return null;
  if (safe.length > 12) return null;
  return safe;
}

function getExtensionFromFileName(fileName: string | null | undefined) {
  if (!fileName) return null;
  const lastSegment = fileName.split("/").pop() || fileName;
  const parts = lastSegment.split(".");
  if (parts.length <= 1) return null;
  const candidate = parts.pop();
  return normalizeExtension(candidate);
}

function getExtensionFromMimeType(mimeType: string | null | undefined) {
  if (!mimeType) return null;
  const mime = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!mime || !mime.includes("/")) return null;
  const subtype = mime.split("/")[1];
  if (!subtype) return null;
  return normalizeExtension(subtype.split("+")[0]);
}

function getSafeFileExtension({
  fileName,
  mimeType,
  fallback = "bin",
}: {
  fileName?: string | null;
  mimeType?: string | null;
  fallback?: string | null;
}) {
  return (
    getExtensionFromFileName(fileName) ||
    getExtensionFromMimeType(mimeType) ||
    normalizeExtension(fallback) ||
    "bin"
  );
}

/** Display classification for a MIME type (asset badges, etc.). */
function getFileClassification(type: string, extension: string) {
  if (fileTypes.audio.includes(type)) return "audio";
  if (fileTypes.video.includes(type)) return "video";
  if (fileTypes.image.includes(type)) return "image";
  if (fileTypes.pdf.includes(type)) return "PDF";
  if (fileTypes["3d model"].includes(type)) return "3D model";
  if (fileTypes["atomic structure"].includes(type))
    return getFileFilterLabel("atomic structure") ?? "atomic structure";
  return `.${extension}`;
}

export {
  FILE_FILTERS,
  fileTypes,
  getFileClassification,
  getFileFilterLabel,
  normalizeExtension,
  getExtensionFromFileName,
  getExtensionFromMimeType,
  getSafeFileExtension,
};
export type { FileFilter };
