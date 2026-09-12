import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("excel-to-pdf");

export const metadata: Metadata = {
  title: "Excel to PDF — Free Online Converter | Docvanta",
  description:
    "Convert Excel spreadsheets to PDF format for free. No signup, no watermarks. Fast and secure online Excel to PDF converter.",
  keywords: ["Excel to PDF", "convert XLSX to PDF", "free PDF converter"],
};

export default function ExcelToPdfPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
