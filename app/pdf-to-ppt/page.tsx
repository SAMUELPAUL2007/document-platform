import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("pdf-to-ppt");

export const metadata: Metadata = {
  title: "PDF to PowerPoint — Free Online Converter | DocFlow",
  description:
    "Convert PDF presentations to PowerPoint slides for free. No signup, no watermarks. Fast and secure online PDF to PPT converter.",
  keywords: ["PDF to PowerPoint", "convert PDF to PPTX", "free PDF converter"],
};

export default function PdfToPptPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
