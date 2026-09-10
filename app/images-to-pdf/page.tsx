import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById } from "@/lib/tools";
import ImagesToPdfClient from "@/components/tool-pages/ImagesToPdfClient";

const tool = getToolById("images-to-pdf");

export const metadata: Metadata = {
  title: "Images to PDF — Free Online Converter | DocFlow",
  description:
    "Convert JPG, PNG, and WebP images to PDF documents. Free, no signup, no watermarks. Fast and secure online image to PDF converter.",
  keywords: ["images to PDF", "JPG to PDF", "PNG to PDF", "image to PDF converter"],
};

export default function ImagesToPdfPage() {
  if (!tool) return notFound();
  return <ImagesToPdfClient />;
}
