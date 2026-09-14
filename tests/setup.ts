import "@testing-library/jest-dom/vitest";
import { mkdir } from "fs/promises";
import { join } from "path";
import { beforeAll } from "vitest";

// Ensure required temporary test directories exist before any test runs.
beforeAll(async () => {
  const ROOT_TMP = join(process.cwd(), ".tmp");
  await mkdir(ROOT_TMP, { recursive: true });
  // Pre‑create common subfolders to avoid race conditions when tests run in parallel.
  const subdirs = [
    "test-pdf-operations",
    "test-office-converters",
    "test-image-to-pdf",
    "test-pdf-to-image",
    "test-cosmic-golden",
    "test-shared-modules",
    "test-lifecycle",
    "test-pdf-to-docx-visual-fidelity",
    "test-pdf-to-docx-complex",
  ];
  for (const dir of subdirs) {
    await mkdir(join(ROOT_TMP, dir), { recursive: true });
  }
});
