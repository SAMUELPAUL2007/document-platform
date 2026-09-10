"use client";

import Link from "next/link";
import { useState } from "react";
import { tools, categories } from "@/lib/tools";

const navCategories = categories.slice(0, 4);

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleDropdownKey = (e: React.KeyboardEvent, catId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveDropdown(activeDropdown === catId ? null : catId);
    } else if (e.key === "Escape") {
      setActiveDropdown(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              DocFlow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navCategories.map((cat) => (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => setActiveDropdown(cat.id)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted cursor-pointer"
                  aria-expanded={activeDropdown === cat.id}
                  aria-haspopup="true"
                  onKeyDown={(e) => handleDropdownKey(e, cat.id)}
                >
                  {cat.name}
                  <svg className="inline-block ml-1 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeDropdown === cat.id && (
                  <div
                    className="absolute top-full left-0 w-72 bg-white rounded-xl border border-border shadow-lg py-2 animate-fade-in"
                    role="menu"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setActiveDropdown(null);
                    }}
                  >
                    {tools
                      .filter((t) => t.category === cat.id)
                      .map((tool) => (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          className="block px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          role="menuitem"
                        >
                          <span className="font-medium text-foreground">{tool.name}</span>
                          <span className="block text-xs mt-0.5 text-muted-foreground">{tool.description}</span>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/editor"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Editor
            </Link>
            <Link
              href="/spreadsheet"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Sheets
            </Link>
            <Link
              href="/presentation"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Slides
            </Link>
            <Link
              href="/workspace"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Workspace
            </Link>
            <Link
              href="/compress-pdf"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Compress
            </Link>
            <Link
              href="/merge-pdf"
              className="inline-flex items-center h-9 px-4 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
            >
              Merge PDF
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => {
              const firstTool = tools.find(t => t.category === cat.id);
              const href = firstTool ? firstTool.href : (
                cat.id === "convert" ? "/pdf-to-word" :
                cat.id === "organize" ? "/merge-pdf" :
                cat.id === "optimize" ? "/compress-pdf" :
                cat.id === "ocr" ? "/ocr-pdf" :
                cat.id === "edit" ? "/editor" :
                cat.id === "share" ? "/protect-pdf" : "#"
              );
              return (
                <div key={cat.id}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    {cat.name}
                  </Link>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border mt-2 space-y-1">
              <Link
                href="/editor"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Editor
              </Link>
              <Link
                href="/spreadsheet"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Sheets
              </Link>
              <Link
                href="/presentation"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Slides
              </Link>
              <Link
                href="/workspace"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Workspace
              </Link>
            </div>
            <div className="pt-2 border-t border-border mt-2">
              <Link
                href="/merge-pdf"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors"
              >
                Merge PDF
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
