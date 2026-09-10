import { describe, it, expect, beforeEach, vi } from "vitest";

interface MockStorage {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  length: number;
  key: ReturnType<typeof vi.fn>;
}

function createMockStorage(): MockStorage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
}

let mockStorage: MockStorage;

beforeEach(() => {
  mockStorage = createMockStorage();
  vi.stubGlobal("window", {
    localStorage: mockStorage,
  });
});

async function loadHistory() {
  vi.resetModules();
  return await import("../lib/history");
}

describe("getRecentActivity", () => {
  it("returns empty array when no entries exist", async () => {
    const { getRecentActivity } = await loadHistory();
    expect(getRecentActivity()).toEqual([]);
  });

  it("returns parsed entries from localStorage", async () => {
    const { getRecentActivity } = await loadHistory();
    const entries = [
      {
        id: "test-1",
        toolId: "compress-pdf",
        toolName: "Compress PDF",
        inputFileName: "test.pdf",
        outputFileName: "test_compressed.pdf",
        timestamp: Date.now() - 1000,
        status: "completed",
      },
    ];
    mockStorage.getItem.mockReturnValueOnce(JSON.stringify(entries));
    const result = getRecentActivity();
    expect(result).toHaveLength(1);
    expect(result[0].toolId).toBe("compress-pdf");
  });

  it("filters out expired entries older than 24 hours", async () => {
    const { getRecentActivity } = await loadHistory();
    const entries = [
      {
        id: "expired",
        toolId: "compress-pdf",
        toolName: "Compress PDF",
        inputFileName: "old.pdf",
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
        status: "completed",
      },
      {
        id: "fresh",
        toolId: "merge-pdf",
        toolName: "Merge PDF",
        inputFileName: "new.pdf",
        timestamp: Date.now() - 1000,
        status: "completed",
      },
    ];
    mockStorage.getItem.mockReturnValueOnce(JSON.stringify(entries));
    const result = getRecentActivity();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fresh");
  });

  it("handles corrupted localStorage gracefully", async () => {
    const { getRecentActivity } = await loadHistory();
    mockStorage.getItem.mockReturnValueOnce("not-json");
    expect(getRecentActivity()).toEqual([]);
  });
});

describe("addActivityEntry", () => {
  it("adds a new entry to localStorage", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "split-pdf",
      toolName: "Split PDF",
      inputFileName: "split.pdf",
      status: "completed",
    });
    const entries = getRecentActivity();
    expect(entries).toHaveLength(1);
    expect(entries[0].toolId).toBe("split-pdf");
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it("prepends new entries most recent first", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "first",
      toolName: "First",
      inputFileName: "a.pdf",
      status: "completed",
    });
    addActivityEntry({
      toolId: "second",
      toolName: "Second",
      inputFileName: "b.pdf",
      status: "completed",
    });
    const entries = getRecentActivity();
    expect(entries).toHaveLength(2);
    expect(entries[0].toolId).toBe("second");
    expect(entries[1].toolId).toBe("first");
  });

  it("limits to 10 entries", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    for (let i = 0; i < 15; i++) {
      addActivityEntry({
        toolId: `tool-${i}`,
        toolName: `Tool ${i}`,
        inputFileName: `file${i}.pdf`,
        status: "completed",
      });
    }
    const entries = getRecentActivity();
    expect(entries).toHaveLength(10);
    expect(entries[0].toolId).toBe("tool-14");
  });

  it("stores output filename when provided", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "compress-pdf",
      toolName: "Compress PDF",
      inputFileName: "input.pdf",
      outputFileName: "output_compressed.pdf",
      status: "completed",
    });
    const entries = getRecentActivity();
    expect(entries[0].outputFileName).toBe("output_compressed.pdf");
  });

  it("stores failed status", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "protect-pdf",
      toolName: "Protect PDF",
      inputFileName: "secret.pdf",
      status: "failed",
    });
    const entries = getRecentActivity();
    expect(entries[0].status).toBe("failed");
  });

  it("stores cancelled status", async () => {
    const { addActivityEntry, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "merge-pdf",
      toolName: "Merge PDF",
      inputFileName: "merge.pdf",
      status: "cancelled",
    });
    const entries = getRecentActivity();
    expect(entries[0].status).toBe("cancelled");
  });
});

describe("clearRecentActivity", () => {
  it("removes all entries", async () => {
    const { addActivityEntry, clearRecentActivity, getRecentActivity } = await loadHistory();
    addActivityEntry({
      toolId: "test",
      toolName: "Test",
      inputFileName: "test.pdf",
      status: "completed",
    });
    expect(getRecentActivity()).toHaveLength(1);
    clearRecentActivity();
    expect(getRecentActivity()).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  it("returns Just now for recent timestamps", async () => {
    const { formatRelativeTime } = await loadHistory();
    expect(formatRelativeTime(Date.now() - 30_000)).toBe("Just now");
  });

  it("returns minutes ago", async () => {
    const { formatRelativeTime } = await loadHistory();
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe("5m ago");
  });

  it("returns hours ago", async () => {
    const { formatRelativeTime } = await loadHistory();
    expect(formatRelativeTime(Date.now() - 3 * 60 * 60_000)).toBe("3h ago");
  });

  it("returns days ago", async () => {
    const { formatRelativeTime } = await loadHistory();
    expect(formatRelativeTime(Date.now() - 2 * 24 * 60 * 60_000)).toBe("2d ago");
  });
});
