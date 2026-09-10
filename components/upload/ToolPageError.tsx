"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface ToolPageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function sanitizeErrorMessage(message: string): string {
  if (!message) return "An unexpected error occurred while processing your request.";
  const lower = message.toLowerCase();
  if (lower.includes("enoent") || lower.includes("no such file")) {
    return "A required file could not be found. Please try again.";
  }
  if (lower.includes("timeout") || lower.includes("sigkill")) {
    return "Processing took too long. Try a smaller file or a simpler operation.";
  }
  if (lower.includes("enoent") || lower.includes("eacces") || lower.includes("permission")) {
    return "A file access error occurred. Please try again.";
  }
  if (lower.includes("not installed") || lower.includes("not found")) {
    return "A required tool is not available. Please contact support.";
  }
  if (message.length > 200 || /[\/\\]/.test(message)) {
    return "An unexpected error occurred. Please try again.";
  }
  return message;
}

export default function ToolPageError({ error, reset }: ToolPageErrorProps) {
  const router = useRouter();

  const userMessage = sanitizeErrorMessage(error.message);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex items-center justify-center px-4" role="alert">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-danger-light flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {userMessage}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
