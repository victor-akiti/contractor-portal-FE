/**
 * Utilities for determining how uploaded files should be opened/displayed
 * based on their filename extension or MIME type.
 *
 * These helpers intentionally avoid relying on Cloudinary URL path conventions
 * (e.g. /image/upload/ vs /raw/upload/) so they work regardless of the
 * storage backend.
 */

const PREVIEWABLE_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
]);

const PREVIEWABLE_VIDEO_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "ogg",
]);

const PREVIEWABLE_PDF_EXTENSION = "pdf";

const DOWNLOAD_ONLY_EXTENSIONS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "pptm",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "csv",
]);

/**
 * Extract the file extension from a filename or URL.
 * Strips query strings and hash fragments before extracting.
 */
export function getFileExtension(filenameOrUrl: string): string {
  if (!filenameOrUrl) return "";
  // Remove query string and fragment
  const clean = filenameOrUrl.split("?")[0].split("#")[0];
  const lastDot = clean.lastIndexOf(".");
  if (lastDot === -1) return "";
  return clean.slice(lastDot + 1).toLowerCase();
}

export type FileCategory = "image" | "video" | "pdf" | "download";

/**
 * Determine how a file should be handled in the UI.
 *
 * Priority: explicit MIME type > filename extension.
 *
 * Returns:
 *  - "image"    → previewable inline (img tag / Next Image)
 *  - "video"    → previewable inline (video tag)
 *  - "pdf"      → browser-native preview (open in new tab)
 *  - "download" → force download, never embed
 */
export function getFileCategory(
  filename?: string,
  mimeType?: string
): FileCategory {
  // Check MIME type first when available
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    if (
      mimeType.includes("officedocument") ||
      mimeType.includes("msword") ||
      mimeType.includes("ms-excel") ||
      mimeType.includes("ms-powerpoint") ||
      mimeType === "application/zip" ||
      mimeType === "application/x-rar-compressed" ||
      mimeType === "application/x-7z-compressed"
    ) {
      return "download";
    }
  }

  // Fall back to extension
  const ext = getFileExtension(filename || "");
  if (PREVIEWABLE_IMAGE_EXTENSIONS.has(ext)) return "image";
  if (PREVIEWABLE_VIDEO_EXTENSIONS.has(ext)) return "video";
  if (ext === PREVIEWABLE_PDF_EXTENSION) return "pdf";
  if (DOWNLOAD_ONLY_EXTENSIONS.has(ext)) return "download";

  // Unknown type – safest to download rather than embed
  return "download";
}

/**
 * Returns true if the file can be previewed in the browser
 * (image, video, or PDF).
 */
export function isPreviewable(filename?: string, mimeType?: string): boolean {
  const cat = getFileCategory(filename, mimeType);
  return cat === "image" || cat === "video" || cat === "pdf";
}

/**
 * Returns the appropriate link props for an anchor/Link element.
 *
 * - Previewable files open in a new tab (target="_blank").
 * - Non-previewable files get a download attribute so the browser
 *   triggers a download instead of navigating.
 */
export function getFileLinkProps(
  url: string,
  filename?: string,
  mimeType?: string
): { href: string; target?: string; download?: string } {
  const category = getFileCategory(filename, mimeType);
  if (category === "download") {
    return {
      href: url,
      download: filename || "",
    };
  }
  return {
    href: url,
    target: "_blank",
  };
}
