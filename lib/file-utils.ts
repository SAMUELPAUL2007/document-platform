export { MAX_FILE_SIZE } from "@/lib/constants";

export const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB"];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${FILE_SIZE_UNITS[i]}`;
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
}

export function isAcceptedFile(file: File, accept: string): boolean {
  if (!accept) return true;
  const allowed = accept.split(",").map((a) => a.trim().toLowerCase());
  const ext = `.${getFileExtension(file.name)}`;
  return allowed.some((a) => {
    if (a.startsWith(".")) return a === ext;
    return file.type === a || file.type.startsWith(a + ";");
  });
}

export function getTotalSize(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}
