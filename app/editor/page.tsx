import type { Metadata } from "next";
import EditorClient from "./EditorClient";

export const metadata: Metadata = {
  title: "Document Editor — Free Online Tool | Docvanta",
  description:
    "Edit documents online with a full-featured WYSIWYG editor. Free, no signup, no watermarks. Create and edit documents in your browser.",
  keywords: ["document editor", "online editor", "WYSIWYG editor", "free document editor"],
};

export default function EditorPage() {
  return <EditorClient />;
}
