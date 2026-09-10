import type { Metadata } from "next";
import PresentationClient from "./PresentationClient";

export const metadata: Metadata = {
  title: "Presentation Editor — Free Online Tool | DocFlow",
  description:
    "Create and edit PowerPoint presentations in your browser. Free, no signup, no watermarks. Full-featured online presentation editor.",
  keywords: ["presentation editor", "online PowerPoint", "PPTX editor", "free presentation editor"],
};

export default function PresentationPage() {
  return <PresentationClient />;
}
