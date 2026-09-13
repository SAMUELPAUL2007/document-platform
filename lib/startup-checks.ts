import { findLibreOffice } from "./processing/converters/libreoffice";
import { logger } from "./logger";

export interface DependencyStatus {
  name: string;
  available: boolean;
  path?: string | null;
}

let cachedResults: DependencyStatus[] | null = null;

export async function checkDependencies(): Promise<DependencyStatus[]> {
  if (cachedResults) return cachedResults;

  const libreOfficePath = await findLibreOffice();

  cachedResults = [
    { name: "libreoffice", available: libreOfficePath !== null, path: libreOfficePath },
  ];

  const missing = cachedResults.filter((d) => !d.available);
  if (missing.length > 0) {
    logger.warn("startup_dependencies_missing", {
      dependencies: missing.map((d) => d.name).join(", "),
    });
  }

  logger.info("startup_dependencies_checked", {
    libreoffice: cachedResults[0].available,
  });

  return cachedResults;
}

export function resetDependencyCache(): void {
  cachedResults = null;
}
