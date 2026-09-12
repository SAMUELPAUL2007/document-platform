import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("merge-pdf");

export const metadata: Metadata = {
  title: "Merge PDF — Free Online Tool | Docvanta",
  description:
    "Combine multiple PDF files into a single document. Free, no signup, no watermarks. Fast and secure online PDF merger.",
  keywords: ["merge PDF", "combine PDF", "PDF merger", "join PDF files"],
};

export default function MergePdfPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
