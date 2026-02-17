import { getFileCategory, getFileLinkProps } from "@/utilities/fileHelpers";

interface FileLinkProps {
  url: string;
  name?: string;
  type?: string; // MIME type
  children?: React.ReactNode;
  className?: string;
}

/**
 * Smart file link that opens previewable files (images, PDFs, videos) in a new
 * tab and forces a download for non-previewable files (DOCX, XLSX, ZIP, etc.).
 *
 * Uses a plain <a> tag so the `download` attribute works correctly.
 * (Next.js <Link> ignores the `download` attribute.)
 */
const FileLink = ({ url, name, type, children, className }: FileLinkProps) => {
  if (!url) return null;

  const linkProps = getFileLinkProps(url, name, type);
  const category = getFileCategory(name, type);
  const label =
    category === "download" ? "Download" : "View";

  return (
    <a {...linkProps} className={className} rel="noopener noreferrer">
      {children ?? label}
    </a>
  );
};

export default FileLink;
