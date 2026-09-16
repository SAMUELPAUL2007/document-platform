import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import { SITE_URL } from "@/lib/constants";
import RotatePdfClient from "@/components/tool-pages/RotatePdfClient";

const tool = getToolById("rotate-pdf");

export const metadata: Metadata = {
  title: "Rotate PDF — Free Online Tool | Docvanta",
  description:
    "Rotate PDF pages to the correct orientation. Free, no signup, no watermarks. Fast and secure online PDF rotation.",
  keywords: ["rotate PDF", "PDF rotation", "turn PDF pages", "change PDF orientation"],
  alternates: {
    canonical: `${SITE_URL}/rotate-pdf`,
  },
};

export default function RotatePdfPage() {
  if (!tool) return notFound();
  return <RotatePdfClient />;
}
