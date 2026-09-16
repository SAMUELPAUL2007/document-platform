import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("ocr-pdf");

export const metadata: Metadata = {
  title: "OCR PDF — Free Online Tool | Docvanta",
  description:
    "Extract embedded text layers from PDF documents. Free, no signup, no watermarks. Fast and secure.",
  keywords: ["OCR PDF", "extract text from PDF", "PDF text extraction", "PDF text layers"],
  alternates: {
    canonical: `${SITE_URL}/ocr-pdf`,
  },
};

export default function OcrPdfPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
