"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { tools, categories } from "@/lib/tools";
import type { ToolCategory } from "@/lib/tools";

const HOVER_DELAY_MS = 120;
const HEADER_HEIGHT_PX = 64;
const VIEWPORT_MARGIN_PX = 16;
const DROPDOWN_MAX_HEIGHT_VH = 70;

type DropdownState = {
  activeCategory: ToolCategory | null;
  isPinned: boolean;
};

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [dropdown, setDropdown] = useState<DropdownState>({
    activeCategory: null,
    isPinned: false,
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState<ToolCategory | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<"below" | "above">("below");
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(400);
  const [dropdownHorizontalOffset, setDropdownHorizontalOffset] = useState<number>(0);

  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Map<ToolCategory, HTMLButtonElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(false);
  const justClickedRef = useRef(false);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const closeDropdown = useCallback(() => {
    clearHoverTimeout();
    isPinnedRef.current = false;
    setDropdown({ activeCategory: null, isPinned: false });
  }, [clearHoverTimeout]);

  const measureDropdownPosition = useCallback((catId: ToolCategory) => {
    const trigger = triggerRefs.current.get(catId);
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN_PX;
    const maxDropdownHeight = Math.floor((viewportHeight * DROPDOWN_MAX_HEIGHT_VH) / 100);

    if (spaceBelow >= 280) {
      setDropdownPosition("below");
      setDropdownMaxHeight(Math.min(maxDropdownHeight, spaceBelow));
    } else {
      const spaceAbove = triggerRect.top - HEADER_HEIGHT_PX - VIEWPORT_MARGIN_PX;
      if (spaceAbove >= 280) {
        setDropdownPosition("above");
        setDropdownMaxHeight(Math.min(maxDropdownHeight, spaceAbove));
      } else {
        setDropdownPosition("below");
        setDropdownMaxHeight(Math.min(maxDropdownHeight, Math.max(spaceBelow, spaceAbove, 200)));
      }
    }

    const DROPDOWN_DESIRED_WIDTH = 320;
    const triggerLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerLeft - VIEWPORT_MARGIN_PX;
    if (spaceRight >= DROPDOWN_DESIRED_WIDTH) {
      setDropdownHorizontalOffset(0);
    } else {
      const offset = spaceRight - DROPDOWN_DESIRED_WIDTH;
      const maxLeftMargin = triggerRect.left - VIEWPORT_MARGIN_PX;
      setDropdownHorizontalOffset(Math.max(offset, -maxLeftMargin));
    }
  }, []);

  const openDropdown = useCallback((catId: ToolCategory, pinned: boolean) => {
    measureDropdownPosition(catId);
    isPinnedRef.current = pinned;
    setDropdown({ activeCategory: catId, isPinned: pinned });
  }, [measureDropdownPosition]);

  // Desktop hover handlers
  const handleTriggerMouseEnter = useCallback((catId: ToolCategory) => {
    if (justClickedRef.current) return;
    if (isPinnedRef.current) return;
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      if (isPinnedRef.current || justClickedRef.current) return;
      openDropdown(catId, false);
    }, HOVER_DELAY_MS);
  }, [clearHoverTimeout, openDropdown]);

  const handleTriggerMouseLeave = useCallback(() => {
    if (justClickedRef.current) return;
    if (isPinnedRef.current) return;
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setDropdown({ activeCategory: null, isPinned: false });
    }, HOVER_DELAY_MS);
  }, [clearHoverTimeout]);

  const handleDropdownMouseEnter = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const handleDropdownMouseLeave = useCallback(() => {
    if (isPinnedRef.current) return;
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setDropdown({ activeCategory: null, isPinned: false });
    }, HOVER_DELAY_MS);
  }, [clearHoverTimeout]);

  // Click handler for category triggers
  const handleTriggerClick = useCallback((catId: ToolCategory) => {
    justClickedRef.current = true;
    clearHoverTimeout();
    setTimeout(() => { justClickedRef.current = false; }, 50);

    if (isPinnedRef.current && dropdown.activeCategory === catId) {
      isPinnedRef.current = false;
      closeDropdown();
    } else {
      isPinnedRef.current = true;
      openDropdown(catId, true);
    }
  }, [dropdown.activeCategory, closeDropdown, openDropdown, clearHoverTimeout]);

  // Keyboard handler for category triggers
  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent, catId: ToolCategory) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTriggerClick(catId);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  }, [handleTriggerClick, closeDropdown]);

  // Mobile handlers
  const handleMobileCategoryClick = useCallback((catId: ToolCategory) => {
    setMobileCategory(prev => prev === catId ? null : catId);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setMobileCategory(null);
  }, []);

  // Close on route change
  useEffect(() => {
    closeDropdown();
    closeMobileMenu();
  }, [pathname, closeDropdown, closeMobileMenu]);

  // Click outside handler
  useEffect(() => {
    if (!dropdown.isPinned) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        headerRef.current &&
        !headerRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdown.isPinned, closeDropdown]);

  // Escape key handler
  useEffect(() => {
    if (!dropdown.isPinned && !mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
        setMobileOpen(false);
        setMobileCategory(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dropdown.isPinned, mobileOpen, closeDropdown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearHoverTimeout();
  }, [clearHoverTimeout]);

  const triggerButtonClasses = (catId: ToolCategory) => {
    const isActive = dropdown.activeCategory === catId && dropdown.isPinned;
    return `px-3 py-2 text-sm font-medium transition-colors rounded-lg cursor-pointer flex items-center gap-1 ${
      isActive
        ? "text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Docvanta
            </span>
          </Link>

          <nav ref={navContainerRef} className="hidden md:flex items-center gap-1">
            {!isHome && (
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                Home
              </Link>
            )}
            {categories.map((cat) => {
              const catTools = tools.filter((t) => t.category === cat.id);
              const isOpen = dropdown.activeCategory === cat.id;
              return (
                <div key={cat.id} className="relative">
                  <button
                    ref={(el) => { if (el) triggerRefs.current.set(cat.id, el); }}
                    className={triggerButtonClasses(cat.id)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onMouseEnter={() => handleTriggerMouseEnter(cat.id)}
                    onMouseLeave={handleTriggerMouseLeave}
                    onClick={() => handleTriggerClick(cat.id)}
                    onKeyDown={(e) => handleTriggerKeyDown(e, cat.id)}
                  >
                    {cat.name}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div
                      ref={dropdownRef}
                      className={`absolute w-80 bg-white rounded-xl border border-border shadow-xl py-2 animate-fade-in ${
                        dropdownPosition === "above" ? "bottom-full mb-2" : "top-full mt-2"
                      }`}
                      style={{
                        maxHeight: `${dropdownMaxHeight}px`,
                        overflowY: "auto",
                        left: `${dropdownHorizontalOffset}px`,
                        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN_PX * 2}px)`,
                      }}
                      role="menu"
                      onMouseEnter={handleDropdownMouseEnter}
                      onMouseLeave={handleDropdownMouseLeave}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") closeDropdown();
                      }}
                    >
                      {catTools.map((tool) => (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          className="block px-4 py-2.5 text-sm hover:bg-muted transition-colors group"
                          role="menuitem"
                          onClick={closeDropdown}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                              <span className="text-xs font-bold">{tool.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground leading-tight">{tool.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tool.description}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

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
            {!isHome && (
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Home
              </Link>
            )}
            {categories.map((cat) => {
              const catTools = tools.filter((t) => t.category === cat.id);
              const isExpanded = mobileCategory === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => handleMobileCategoryClick(cat.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    {cat.name}
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="pl-4 space-y-0.5 mt-0.5 pb-1">
                      {catTools.map((tool) => (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          onClick={closeMobileMenu}
                          className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          {tool.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-2 border-t border-border mt-2">
              <Link
                href="/merge-pdf"
                onClick={closeMobileMenu}
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
