import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("ppt-to-pdf");

export const metadata: Metadata = {
  title: "PowerPoint to PDF — Free Online Converter | Docvanta",
  description:
    "Convert PowerPoint presentations to PDF format for free. No signup, no watermarks. Fast and secure online PPT to PDF converter.",
  keywords: ["PowerPoint to PDF", "convert PPTX to PDF", "free PDF converter"],
};

export default function PptToPdfPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
