import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import DeletePagesClient from "@/components/tool-pages/DeletePagesClient";

const tool = getToolById("delete-pages");

export const metadata: Metadata = {
  title: "Delete PDF Pages — Free Online Tool | Docvanta",
  description:
    "Remove specific pages from a PDF document. Free, no signup, no watermarks. Fast and secure online page deletion.",
  keywords: ["delete PDF pages", "remove PDF pages", "PDF page remover", "erase PDF pages"],
};

export default function DeletePagesPage() {
  if (!tool) return notFound();
  return <DeletePagesClient />;
}
