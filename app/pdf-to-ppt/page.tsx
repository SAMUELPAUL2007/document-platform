import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("pdf-to-ppt");

export const metadata: Metadata = {
  title: "PDF to PowerPoint — Free Online Converter | Docvanta",
  description:
    "Convert PDF presentations to PowerPoint slides for free. No signup, no watermarks. Fast and secure online PDF to PPT converter.",
  keywords: ["PDF to PowerPoint", "convert PDF to PPTX", "free PDF converter"],
  alternates: {
    canonical: `${SITE_URL}/pdf-to-ppt`,
  },
};

export default function PdfToPptPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
