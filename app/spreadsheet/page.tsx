import type { Metadata } from "next";
import SpreadsheetClient from "./SpreadsheetClient";

export const metadata: Metadata = {
  title: "Spreadsheet Editor — Free Online Tool | DocFlow",
  description:
    "Edit XLSX files online with a full-featured spreadsheet editor. Free, no signup, no watermarks. Create and edit spreadsheets in your browser.",
  keywords: ["spreadsheet editor", "online spreadsheet", "XLSX editor", "free spreadsheet editor"],
};

export default function SpreadsheetPage() {
  return <SpreadsheetClient />;
}
