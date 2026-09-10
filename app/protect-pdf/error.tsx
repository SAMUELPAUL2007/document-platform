"use client";

import ToolPageError from "@/components/upload/ToolPageError";

export default function ToolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ToolPageError error={error} reset={reset} />;
}
