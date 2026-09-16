import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import CompressPdfClient from "@/components/tool-pages/CompressPdfClient";

const tool = getToolById("compress-pdf");

export const metadata: Metadata = {
  title: "Compress PDF — Free Online Tool | Docvanta",
  description:
    "Reduce PDF file size while maintaining quality. Free, no signup, no watermarks. Fast and secure online PDF compression.",
  keywords: ["compress PDF", "reduce PDF size", "PDF optimizer", "shrink PDF"],
  alternates: {
    canonical: `${SITE_URL}/compress-pdf`,
  },
};

export default function CompressPdfPage() {
  if (!tool) return notFound();
  return <CompressPdfClient />;
}
