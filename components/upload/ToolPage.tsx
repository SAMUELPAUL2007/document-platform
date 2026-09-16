"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import ProcessingUI from "@/components/upload/ProcessingUI";
import ResultUI from "@/components/upload/ResultUI";
import AdSlot from "@/components/ui/AdSlot";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { uploadFiles, pollJobStatus, getDownloadUrl, cancelJobApi } from "@/lib/api";
import { addActivityEntry } from "@/lib/history";
import { getToolsByCategory } from "@/lib/tools";
import { toolSeoData } from "@/lib/seo-data";
import type { JobStatus } from "@/lib/api";
import type { ProgressSnapshot } from "@/lib/progress";
import type { Tool } from "@/lib/tools";

interface ToolPageProps {
  tool: Tool;
  options?: Record<string, string>;
  optionsPanel?: React.ReactNode;
  optionsLabel?: string;
}

type PageStatus = "idle" | "uploading" | "processing" | "complete" | "error" | "cancelled";

interface PageState {
  status: PageStatus;
  progress: number;
  progressSnapshot?: ProgressSnapshot;
  error?: string;
  jobId?: string;
  resultFileName?: string;
}

export default function ToolPage({ tool, options: externalOptions, optionsPanel, optionsLabel }: ToolPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<PageState>({ status: "idle", progress: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const getDisplayFileName = useCallback(() => {
    if (files.length === 0) return "unknown";
    if (files.length === 1) return files[0]?.name || "unknown";
    return `${files[0]?.name} (+${files.length - 1} more)`;
  }, [files]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, tool.maxFiles || 10));
    setState({ status: "idle", progress: 0 });
  }, [tool.maxFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "uploading", progress: 5 });

    try {
      const result = await uploadFiles(tool.id, files, externalOptions);
      if (controller.signal.aborted) return;
      setState({ status: "uploading", progress: 25, jobId: result.jobId });

      const finalStatus = await pollJobStatus(
        result.jobId,
        (status: JobStatus) => {
          if (controller.signal.aborted) return;
          if (status.state === "CANCELLED") {
            setState({ status: "cancelled", progress: 0, jobId: result.jobId });
            return;
          }
          if (status.state === "PROCESSING" || status.state === "QUEUED") {
            const snapshot = status.progress;
            const hasProgress = snapshot?.percent !== undefined && snapshot.percent > 0;
            const serverProgress = hasProgress ? snapshot!.percent : 0;
            setState((prev) => ({
              ...prev,
              status: "processing",
              progress: hasProgress ? Math.max(prev.progress, serverProgress) : prev.progress,
              progressSnapshot: snapshot,
            }));
          }
        },
        800,
        controller.signal
      );

      if (controller.signal.aborted) return;

      if (finalStatus.state === "COMPLETED") {
        setState({
          status: "complete",
          progress: 100,
          jobId: result.jobId,
          resultFileName: finalStatus.resultFileName,
        });
        addActivityEntry({
          toolId: tool.id,
          toolName: tool.name,
          inputFileName: getDisplayFileName(),
          fileCount: files.length,
          outputFileName: finalStatus.resultFileName,
          status: "completed",
        });
      } else if (finalStatus.state === "CANCELLED") {
        setState({
          status: "cancelled",
          progress: 0,
          jobId: result.jobId,
        });
        addActivityEntry({
          toolId: tool.id,
          toolName: tool.name,
          inputFileName: getDisplayFileName(),
          fileCount: files.length,
          status: "cancelled",
        });
      } else {
        setState({
          status: "error",
          progress: 0,
          error: finalStatus.error || "Processing failed",
        });
        addActivityEntry({
          toolId: tool.id,
          toolName: tool.name,
          inputFileName: getDisplayFileName(),
          fileCount: files.length,
          status: "failed",
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setState({ status: "error", progress: 0, error: message });
    }
  }, [files, tool.id, tool.name, externalOptions, getDisplayFileName]);

  const handleCancel = useCallback(async () => {
    const currentJobId = state.jobId;
    abortControllerRef.current?.abort();
    if (currentJobId) {
      try {
        await cancelJobApi(currentJobId);
      } catch {
        // Best effort — UI already reflects cancelled state
      }
    }
    setState((prev) => ({
      ...prev,
      status: "cancelled",
      progress: 0,
      progressSnapshot: undefined,
    }));
  }, [state.jobId]);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setFiles([]);
    setState({ status: "idle", progress: 0 });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!state.jobId) return;
    const url = getDownloadUrl(state.jobId);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = state.resultFileName || "result";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setState((prev) => ({ ...prev, error: message, status: "error" }));
    }
  }, [state.jobId, state.resultFileName]);

  const isProcessing = state.status === "uploading" || state.status === "processing";
  const isComplete = state.status === "complete";
  const isError = state.status === "error";
  const isCancelled = state.status === "cancelled";
  const hasFiles = files.length > 0;
  const canAddMore = hasFiles && !isProcessing && !isComplete && !isError && !isCancelled && (!tool.maxFiles || files.length < tool.maxFiles);
  const showOptionsPanel = !!optionsPanel && (hasFiles || isProcessing);

  return (
    <main className="bg-surface" role="main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className={`tool-page-layout${showOptionsPanel ? " tool-page-layout--with-options" : ""}`}>
          {/* Main tool column */}
          <div className="tool-page-main">
            <div className="text-center mb-8 animate-slide-up">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {tool.name}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">{tool.description}</p>
            </div>

            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {state.status === "uploading" && "Uploading your file..."}
              {state.status === "processing" && "Converting your file..."}
              {state.status === "complete" && "Conversion complete. Your file is ready to download."}
              {state.status === "error" && `Conversion failed: ${state.error}`}
              {state.status === "cancelled" && "Conversion was cancelled."}
            </div>

            {/* DropZone: full size when no files */}
            {!hasFiles && !isComplete && !isError && !isCancelled && (
              <div className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
                <DropZone
                  accept={tool.accept}
                  maxFiles={tool.maxFiles}
                  onFilesSelected={handleFilesSelected}
                />
              </div>
            )}

            {/* Selected files + controls */}
            {hasFiles && !isComplete && !isError && !isCancelled && (
              <div className="space-y-3 animate-slide-up">
                {/* File cards */}
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <FileCard
                      key={`${file.name}-${i}`}
                      file={file}
                      status={
                        isProcessing
                          ? state.status === "uploading"
                            ? "uploading"
                            : "processing"
                          : "pending"
                      }
                      progress={isProcessing ? state.progress : 0}
                      onRemove={
                        !isProcessing ? () => handleRemoveFile(i) : undefined
                      }
                    />
                  ))}
                </div>

                {/* Add another file */}
                {canAddMore && (
                  <DropZone
                    accept={tool.accept}
                    maxFiles={tool.maxFiles}
                    onFilesSelected={handleFilesSelected}
                    compact
                  />
                )}

                {/* Processing UI */}
                {isProcessing && (
                  <ProcessingUI
                    status={state.status === "uploading" ? "uploading" : "processing"}
                    progress={state.progress}
                    progressSnapshot={state.progressSnapshot}
                    onCancel={handleCancel}
                    canCancel={state.status === "processing"}
                  />
                )}

                {/* Primary action button (no options panel) */}
                {!isProcessing && !showOptionsPanel && (
                  <div className="flex justify-center pt-2">
                    <Button size="lg" onClick={handleProcess}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {tool.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Result state */}
            {isComplete && (
              <ResultUI
                toolName={tool.name}
                fileName={state.resultFileName}
                onDownload={handleDownload}
                onReset={handleReset}
              />
            )}

            {/* Cancelled state */}
            {isCancelled && (
              <div className="mt-6 p-6 rounded-2xl bg-muted border border-border animate-fade-in text-center" role="status">
                <p className="text-sm font-semibold text-foreground">Conversion Cancelled</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The operation was cancelled. No output was generated.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Convert another file
                  </Button>
                </div>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="mt-6 p-6 rounded-2xl bg-danger-light border border-red-200 animate-fade-in" role="alert">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-danger shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Conversion Failed</p>
                    <p className="text-sm text-red-700 mt-1">{state.error}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Try again
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Convert another file
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom ad — hidden on mobile via CSS */}
            <div className="tool-page-bottom-ad">
              <AdSlot placement="tool-bottom" size="728x90" />
            </div>

            {/* 300x250 ad — mobile: centered below tool area; desktop: sticky sidebar */}
            <div className="tool-page-sidebar-ad">
              <AdSlot placement="tool-sidebar" size="300x250" />
            </div>

            {/* SEO content section */}
            {toolSeoData[tool.id] && (
              <div className="mt-10 space-y-10 text-sm text-muted-foreground leading-relaxed">
                {/* Introduction */}
                <section>
                  <p>{toolSeoData[tool.id].intro}</p>
                </section>

                {/* How to use */}
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-3">How to use this tool</h2>
                  <ol className="list-decimal list-inside space-y-2">
                    {toolSeoData[tool.id].howToUse.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </section>

                {/* Features */}
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-3">What you can do</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {toolSeoData[tool.id].features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </section>

                {/* FAQs */}
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Frequently asked questions</h2>
                  <div className="space-y-4">
                    {toolSeoData[tool.id].faqs.map((faq, i) => (
                      <details key={i} className="group rounded-xl border border-border bg-white p-4">
                        <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
                          {faq.question}
                          <svg className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <p className="mt-3 text-muted-foreground">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* JSON-LD structured data */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  name: tool.name,
                  description: tool.description,
                  url: `https://docvanta.onrender.com${tool.href}`,
                  applicationCategory: "UtilitiesApplication",
                  operatingSystem: "Any",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                }),
              }}
            />
            {toolSeoData[tool.id] && (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: toolSeoData[tool.id].faqs.map((faq) => ({
                      "@type": "Question",
                      name: faq.question,
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: faq.answer,
                      },
                    })),
                  }),
                }}
              />
            )}

            {/* Related tools — below bottom ad, inside main content flow */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Related tools</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getToolsByCategory(tool.category)
                  .filter((t) => t.id !== tool.id)
                  .slice(0, 4)
                  .map((related) => (
                    <Link href={related.href} key={related.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-surface transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-primary-light text-primary text-sm font-bold flex items-center justify-center shrink-0">
                        {related.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{related.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{related.description}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

          </div>

          {/* Options sidebar — desktop only, when tool has options and files are selected */}
          {showOptionsPanel && (
            <aside className="tool-page-options-panel" aria-label={optionsLabel || "Tool options"}>
              <div className="tool-page-options-sticky">
                {optionsLabel && (
                  <h2 className="text-sm font-semibold text-foreground mb-3">{optionsLabel}</h2>
                )}
                {optionsPanel}
                {!isProcessing && (
                  <div className="mt-4">
                    <Button size="lg" className="w-full" onClick={handleProcess}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {tool.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          )}

        </div>
      </div>
    </main>
  );
}
