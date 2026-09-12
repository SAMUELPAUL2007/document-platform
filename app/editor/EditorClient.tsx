"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const DocumentEditor = dynamic(
  () => import("@/components/editor/DocumentEditor").then((mod) => mod.DocumentEditor),
  { ssr: false }
);

export default function EditorClient() {
  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 z-50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800">Docvanta</span>
          </Link>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/workspace" className="text-gray-600 hover:text-blue-600 transition-colors">
            Workspace
          </Link>
          <Link href="/tools" className="text-gray-600 hover:text-blue-600 transition-colors">
            All Tools
          </Link>
        </nav>
      </header>

      <DocumentEditor />
    </div>
  );
}
