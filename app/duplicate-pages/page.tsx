import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import DuplicatePagesClient from "@/components/tool-pages/DuplicatePagesClient";

const tool = getToolById("duplicate-pages");

export const metadata: Metadata = {
  title: "Duplicate PDF Pages — Free Online Tool | Docvanta",
  description:
    "Duplicate specific pages within a PDF document. Free, no signup, no watermarks. Fast and secure online page duplication.",
  keywords: ["duplicate PDF pages", "copy PDF pages", "PDF page duplicator"],
};

export default function DuplicatePagesPage() {
  if (!tool) return notFound();
  return <DuplicatePagesClient />;
}
