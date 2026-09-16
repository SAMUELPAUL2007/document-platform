import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import SplitPdfClient from "@/components/tool-pages/SplitPdfClient";

const tool = getToolById("split-pdf");

export const metadata: Metadata = {
  title: "Split PDF — Free Online Tool | Docvanta",
  description:
    "Separate a PDF into individual pages or ranges. Free, no signup, no watermarks. Fast and secure online PDF splitter.",
  keywords: ["split PDF", "separate PDF", "PDF splitter", "extract PDF pages"],
  alternates: {
    canonical: `${SITE_URL}/split-pdf`,
  },
};

export default function SplitPdfPage() {
  if (!tool) return notFound();
  return <SplitPdfClient />;
}
