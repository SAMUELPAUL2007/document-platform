import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("word-to-pdf");

export const metadata: Metadata = {
  title: "Word to PDF — Free Online Converter | Docvanta",
  description:
    "Convert Word documents to PDF format for free. No signup, no watermarks. Fast and secure online Word to PDF converter.",
  keywords: ["Word to PDF", "convert DOCX to PDF", "free PDF converter"],
};

export default function WordToPdfPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
