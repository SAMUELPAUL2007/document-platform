"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SpreadsheetEditor = dynamic(
  () => import("@/components/spreadsheet/SpreadsheetEditor").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading spreadsheet editor...</span>
        </div>
      </div>
    ),
  }
);

export default function SpreadsheetClient() {
  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 z-50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18M3 6h18M3 18h18"
                />
              </svg>
            </div>
            <span className="font-bold text-gray-800">DocFlow</span>
          </Link>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/editor"
            className="text-gray-600 hover:text-blue-600 transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/workspace"
            className="text-gray-600 hover:text-blue-600 transition-colors"
          >
            Workspace
          </Link>
        </nav>
      </header>

      <SpreadsheetEditor />
    </div>
  );
}
