import type { Metadata } from "next";
import WorkspaceClient from "./WorkspaceClient";

export const metadata: Metadata = {
  title: "Workspace — Docvanta",
  description:
    "Manage your PDF documents with a powerful workspace. View, edit, reorder, merge, and annotate pages with an intuitive interface.",
  keywords: ["PDF workspace", "PDF viewer", "PDF editor", "document workspace"],
};

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
