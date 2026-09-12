import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import PdfToPngClient from "@/components/tool-pages/PdfToPngClient";

const tool = getToolById("pdf-to-png");

export const metadata: Metadata = {
  title: "PDF to PNG — Free Online Converter | Docvanta",
  description:
    "Convert PDF pages to high-quality PNG images. Free, no signup, no watermarks. Fast and secure online PDF to PNG converter.",
  keywords: ["PDF to PNG", "convert PDF to PNG", "PDF to image", "PDF to picture"],
};

export default function PdfToPngPage() {
  if (!tool) return notFound();
  return <PdfToPngClient />;
}
