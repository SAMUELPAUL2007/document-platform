const STORAGE_KEY = "docflow_recent_activity";
const MAX_ENTRIES = 10;
const ENTRY_TTL_MS = 24 * 60 * 60 * 1000;

export interface ActivityEntry {
  id: string;
  toolId: string;
  toolName: string;
  inputFileName: string;
  fileCount?: number;
  outputFileName?: string;
  timestamp: number;
  status: "completed" | "failed" | "cancelled";
}

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = "__storage_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readEntries(): ActivityEntry[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: ActivityEntry[] = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.filter(
      (e) => e && typeof e.id === "string" && typeof e.timestamp === "number" && Date.now() - e.timestamp < ENTRY_TTL_MS
    );
  } catch {
    return [];
  }
}

function writeEntries(entries: ActivityEntry[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

export function getRecentActivity(): ActivityEntry[] {
  return readEntries();
}

export function addActivityEntry(entry: Omit<ActivityEntry, "id" | "timestamp">): void {
  const entries = readEntries();
  const newEntry: ActivityEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  entries.unshift(newEntry);
  writeEntries(entries);
}

export function removeActivityEntry(id: string): void {
  const entries = readEntries();
  writeEntries(entries.filter((e) => e.id !== id));
}

export function clearRecentActivity(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
