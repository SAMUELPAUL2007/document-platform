import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import ReorderPagesClient from "@/components/tool-pages/ReorderPagesClient";

const tool = getToolById("reorder-pages");

export const metadata: Metadata = {
  title: "Reorder PDF Pages — Free Online Tool | Docvanta",
  description:
    "Change the order of pages in a PDF document. Free, no signup, no watermarks. Fast and secure online page reordering.",
  keywords: ["reorder PDF pages", "change PDF page order", "PDF page rearrange"],
};

export default function ReorderPagesPage() {
  if (!tool) return notFound();
  return <ReorderPagesClient />;
}
