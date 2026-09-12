import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import ProtectPdfClient from "@/components/tool-pages/ProtectPdfClient";

const tool = getToolById("protect-pdf");

export const metadata: Metadata = {
  title: "Protect PDF — Free Online Tool | Docvanta",
  description:
    "Add password protection to your PDF files. Free, no signup, no watermarks. Fast and secure online PDF protection.",
  keywords: ["protect PDF", "password protect PDF", "PDF encryption", "secure PDF"],
};

export default function ProtectPdfPage() {
  if (!tool) return notFound();
  return <ProtectPdfClient />;
}
