import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("pdf-to-excel");

export const metadata: Metadata = {
  title: "PDF to Excel — Free Online Converter | Docvanta",
  description:
    "Convert PDF documents to editable Excel spreadsheets for free. No signup, no watermarks. Fast and secure online PDF to Excel converter.",
  keywords: ["PDF to Excel", "convert PDF to XLSX", "free PDF converter"],
};

export default function PdfToExcelPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
