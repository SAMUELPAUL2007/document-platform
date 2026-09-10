"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getRecentActivity,
  removeActivityEntry,
  clearRecentActivity,
  formatRelativeTime,
  type ActivityEntry,
} from "@/lib/history";

const STATUS_STYLES: Record<string, { icon: string; color: string }> = {
  completed: { icon: "\u2713", color: "text-success" },
  failed: { icon: "\u2717", color: "text-danger" },
  cancelled: { icon: "\u2298", color: "text-muted-foreground" },
};

export default function RecentActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(getRecentActivity());
  }, []);

  if (!mounted || entries.length === 0) return null;

  const handleDismiss = (id: string) => {
    removeActivityEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClear = () => {
    clearRecentActivity();
    setEntries([]);
  };

  return (
    <section className="py-12 sm:py-16 bg-surface" aria-label="Recent Activity">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear all recent activity"
          >
            Clear all
          </button>
        </div>
        <ul className="space-y-2" role="list" aria-live="polite">
          {entries.map((entry) => {
            const style = STATUS_STYLES[entry.status] || STATUS_STYLES.completed;
            return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border"
                >
                  <span className={`text-sm font-bold ${style.color}`} aria-hidden="true">
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${entry.toolId}`} className="text-sm font-medium text-foreground hover:underline truncate">
                      {entry.toolName}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.inputFileName}
                      {entry.status === "completed" && entry.outputFileName && (
                        <span className="ml-1">&rarr; {entry.outputFileName}</span>
                      )}
                      {entry.status === "completed" && !entry.outputFileName && (
                        <span className="ml-1 text-muted-foreground/60">&mdash; result no longer available</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                  <button
                    onClick={() => handleDismiss(entry.id)}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors shrink-0 -mr-1"
                    aria-label={`Dismiss ${entry.toolName} activity`}
                  >
                    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
