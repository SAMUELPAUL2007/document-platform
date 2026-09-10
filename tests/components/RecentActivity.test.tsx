// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecentActivity from "@/components/home/RecentActivity";

interface MockStorage {
  store: Record<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

function createMockStorage(): MockStorage {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  };
}

let mockStorage: MockStorage;

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage = createMockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
});

const SAMPLE_ENTRY = {
  id: "test-1",
  toolId: "compress-pdf",
  toolName: "Compress PDF",
  inputFileName: "test.pdf",
  outputFileName: "test_compressed.pdf",
  timestamp: Date.now() - 1000,
  status: "completed" as const,
};

describe("RecentActivity", () => {
  it("renders nothing when no entries exist", async () => {
    const { container } = render(<RecentActivity />);
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders nothing when mounted but storage is empty", async () => {
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.queryByText("Recent Activity")).toBeNull();
    });
  });

  it("renders entries from localStorage", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeTruthy();
      expect(screen.getByText("Compress PDF")).toBeTruthy();
    });
  });

  it("renders tool name as a link", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      const link = screen.getByText("Compress PDF");
      expect(link.closest("a")?.getAttribute("href")).toBe("/compress-pdf");
    });
  });

  it("renders input file name", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText(/test\.pdf/)).toBeTruthy();
    });
  });

  it("renders output file name for completed entries", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText(/test_compressed\.pdf/)).toBeTruthy();
    });
  });

  it("shows result no longer available when output is missing", async () => {
    const entry = { ...SAMPLE_ENTRY, outputFileName: undefined };
    mockStorage.getItem.mockReturnValue(JSON.stringify([entry]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText(/result no longer available/)).toBeTruthy();
    });
  });

  it("dismisses an entry when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText("Compress PDF")).toBeTruthy();
    });

    const dismissBtn = screen.getByRole("button", { name: /Dismiss Compress PDF activity/i });
    await user.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText("Compress PDF")).toBeNull();
    });
  });

  it("clears all entries when Clear all is clicked", async () => {
    const user = userEvent.setup();
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeTruthy();
    });

    const clearBtn = screen.getByRole("button", { name: /Clear all recent activity/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText("Recent Activity")).toBeNull();
    });
  });

  it("renders multiple entries", async () => {
    const entries = [
      SAMPLE_ENTRY,
      {
        ...SAMPLE_ENTRY,
        id: "test-2",
        toolId: "merge-pdf",
        toolName: "Merge PDF",
        inputFileName: "merged.pdf",
        outputFileName: "result.pdf",
      },
    ];
    mockStorage.getItem.mockReturnValue(JSON.stringify(entries));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText("Compress PDF")).toBeTruthy();
      expect(screen.getByText("Merge PDF")).toBeTruthy();
    });
  });

  it("has accessible live region", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      const list = screen.getByRole("list");
      expect(list.getAttribute("aria-live")).toBe("polite");
    });
  });

  it("renders relative time", async () => {
    mockStorage.getItem.mockReturnValue(JSON.stringify([SAMPLE_ENTRY]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText(/ago|Just now/)).toBeTruthy();
    });
  });

  it("shows failed status icon", async () => {
    const entry = { ...SAMPLE_ENTRY, status: "failed" as const };
    mockStorage.getItem.mockReturnValue(JSON.stringify([entry]));
    render(<RecentActivity />);
    await waitFor(() => {
      expect(screen.getByText("Compress PDF")).toBeTruthy();
    });
  });
});
