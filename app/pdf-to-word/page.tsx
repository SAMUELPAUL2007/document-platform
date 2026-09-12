import ToolPage from "@/components/upload/ToolPage";
import { getToolById } from "@/lib/tools";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const tool = getToolById("pdf-to-word");

export const metadata: Metadata = {
  title: "PDF to Word — Free Online Converter | Docvanta",
  description:
    "Convert PDF documents to editable Word files for free. No signup, no watermarks. Fast and secure online PDF to Word converter.",
  keywords: ["PDF to Word", "convert PDF to DOCX", "free PDF converter"],
};

export default function PdfToWordPage() {
  if (!tool) return notFound();
  return <ToolPage tool={tool} />;
}
