import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import PdfToJpgClient from "@/components/tool-pages/PdfToJpgClient";

const tool = getToolById("pdf-to-jpg");

export const metadata: Metadata = {
  title: "PDF to JPG — Free Online Converter | Docvanta",
  description:
    "Convert PDF pages to high-quality JPG images. Free, no signup, no watermarks. Fast and secure online PDF to JPG converter.",
  keywords: ["PDF to JPG", "PDF to JPEG", "convert PDF to image", "PDF to picture"],
  alternates: {
    canonical: `${SITE_URL}/pdf-to-jpg`,
  },
};

export default function PdfToJpgPage() {
  if (!tool) return notFound();
  return <PdfToJpgClient />;
}
