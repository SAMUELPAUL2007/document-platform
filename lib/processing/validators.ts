import { extname } from "path";

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff],
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
  ],
  "application/pdf": [
    [0x25, 0x50, 0x44, 0x46],
  ],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.ms-word": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.ms-excel": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.ms-powerpoint": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  ],
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateExtension(filename: string, acceptList: string): ValidationResult {
  if (!acceptList) return { valid: true };

  const allowed = acceptList.split(",").map((a) => a.trim().toLowerCase());
  const ext = extname(filename).toLowerCase();

  if (!ext) {
    return { valid: false, error: `File "${filename}" has no extension` };
  }

  if (!allowed.includes(ext)) {
    return {
      valid: false,
      error: `File "${filename}" has extension "${ext}" which is not in the allowed list: ${allowed.join(", ")}`,
    };
  }

  return { valid: true };
}

export function validateMimeType(
  filename: string,
  declaredMimeType: string,
  acceptList: string
): ValidationResult {
  if (!acceptList) return { valid: true };

  const ext = extname(filename).toLowerCase();
  const expectedMime = EXTENSION_TO_MIME[ext];

  if (expectedMime && declaredMimeType !== expectedMime) {
    return {
      valid: false,
      error: `File "${filename}" declares MIME type "${declaredMimeType}" but extension suggests "${expectedMime}"`,
    };
  }

  return { valid: true };
}

export function validateFileSize(size: number, maxSizeBytes: number): ValidationResult {
  if (size <= 0) {
    return { valid: false, error: "File is empty" };
  }

  if (size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    const actualMB = (size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size ${actualMB} MB exceeds maximum of ${maxMB} MB`,
    };
  }

  return { valid: true };
}

export function validateFileSignature(
  buffer: Buffer,
  declaredMimeType: string
): ValidationResult {
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return { valid: true };

  const header = Array.from(buffer.slice(0, 16));

  const matches = signatures.some((sig) =>
    sig.every((byte, i) => header[i] === byte)
  );

  if (!matches) {
    return {
      valid: false,
      error: `File content does not match declared type "${declaredMimeType}"`,
    };
  }

  if (declaredMimeType === "image/webp") {
    const riff = String.fromCharCode(...header.slice(0, 4));
    if (riff !== "RIFF") {
      return {
        valid: false,
        error: "File claims to be WebP but missing RIFF header",
      };
    }
  }

  return { valid: true };
}

export function getMimeTypeFromExtension(filename: string): string | null {
  const ext = extname(filename).toLowerCase();
  return EXTENSION_TO_MIME[ext] || null;
}

export function validateFile(
  filename: string,
  mimeType: string,
  size: number,
  buffer: Buffer,
  acceptList: string,
  maxSizeBytes: number
): ValidationResult {
  let result = validateExtension(filename, acceptList);
  if (!result.valid) return result;

  result = validateMimeType(filename, mimeType, acceptList);
  if (!result.valid) return result;

  result = validateFileSize(size, maxSizeBytes);
  if (!result.valid) return result;

  const inferredMime = getMimeTypeFromExtension(filename) || mimeType;
  result = validateFileSignature(buffer, inferredMime);
  if (!result.valid) return result;

  return { valid: true };
}
