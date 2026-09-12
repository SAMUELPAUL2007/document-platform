import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import ExtractPagesClient from "@/components/tool-pages/ExtractPagesClient";

const tool = getToolById("extract-pages");

export const metadata: Metadata = {
  title: "Extract PDF Pages — Free Online Tool | Docvanta",
  description:
    "Extract specific pages from a PDF document. Free, no signup, no watermarks. Fast and secure online page extraction.",
  keywords: ["extract PDF pages", "pull pages from PDF", "PDF page extractor"],
};

export default function ExtractPagesPage() {
  if (!tool) return notFound();
  return <ExtractPagesClient />;
}
