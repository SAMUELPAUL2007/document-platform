// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToolPage from "@/components/upload/ToolPage";
import type { Tool } from "@/lib/tools";

vi.mock("@/lib/api", () => ({
  uploadFiles: vi.fn(),
  pollJobStatus: vi.fn(),
  getDownloadUrl: vi.fn((jobId: string) => `/api/jobs/${jobId}/download`),
  cancelJobApi: vi.fn(),
}));

vi.mock("@/lib/history", () => ({
  addActivityEntry: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/tools", () => ({
  getToolsByCategory: vi.fn(() => []),
}));

import { uploadFiles, pollJobStatus, cancelJobApi } from "@/lib/api";
import { addActivityEntry } from "@/lib/history";

const MOCK_TOOL: Tool = {
  id: "compress-pdf",
  name: "Compress PDF",
  description: "Optimize PDF files",
  category: "optimize",
  icon: "compress",
  href: "/compress-pdf",
  accept: ".pdf",
  maxFiles: 5,
  actionLabel: "Compress PDF",
};

function makeFile(name = "test.pdf", size = 1024): File {
  const file = new File(["content"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () { yield* files; },
  };
  files.forEach((f, i) => { (list as Record<string, unknown>)[String(i)] = f; });
  return list as unknown as FileList;
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: makeFileList([file]), configurable: true });
  act(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: makeFileList(files), configurable: true });
  act(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ToolPage", () => {
  describe("initial state", () => {
    it("renders tool name and description", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(screen.getByText("Compress PDF")).toBeTruthy();
      expect(screen.getByText("Optimize PDF files")).toBeTruthy();
    });

    it("renders dropzone", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(screen.getByText("Drag & drop files here")).toBeTruthy();
    });

    it("does not show action button when no files selected", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(screen.queryByText("Compress PDF", { selector: "button" })).toBeNull();
    });

    it("has screen reader live region", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });
  });

  describe("file selection", () => {
    it("shows action button after file is selected", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      expect(screen.getByText("Compress PDF", { selector: "button" })).toBeTruthy();
    });

    it("shows file card with filename after selection", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("document.pdf"));
      expect(screen.getByText("document.pdf")).toBeTruthy();
    });

    it("hides dropzone after files are selected", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      expect(screen.queryByText("Drag & drop files here")).toBeNull();
    });
  });

  describe("processing flow", () => {
    it("transitions to complete state", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "output.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getByText("Your file is ready")).toBeTruthy();
      });

      expect(addActivityEntry).toHaveBeenCalledWith(
        expect.objectContaining({ toolId: "compress-pdf", status: "completed" })
      );
    });

    it("shows error state on failure", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "FAILED", error: "Conversion failed" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getByText("Conversion Failed")).toBeTruthy();
        expect(screen.getByText("Conversion failed")).toBeTruthy();
      });

      expect(addActivityEntry).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" })
      );
    });

    it("shows uploading status text during upload", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockImplementation(() => new Promise(() => {}));

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getAllByText("Uploading your file...").length).toBeGreaterThan(0);
      });
    });
  });

  describe("cancellation", () => {
    it("shows cancelled state when cancel is triggered", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockImplementation((_jobId, onStatus) => {
        return new Promise(() => {
          setTimeout(() => {
            onStatus({ jobId: "job-1", state: "PROCESSING", progress: { percent: 30, stage: "processing" } });
          }, 0);
        });
      });
      vi.mocked(cancelJobApi).mockResolvedValue({ message: "Cancelled" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeTruthy();
      });

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.getByText("Conversion Cancelled")).toBeTruthy();
      });
    });
  });

  describe("convert another file state isolation", () => {
    it("resets to idle state when Convert another file is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "out.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));

      await waitFor(() => {
        expect(screen.getByText("Drag & drop files here")).toBeTruthy();
        expect(screen.queryByText("Your file is ready")).toBeNull();
        expect(screen.queryByText("Compress PDF", { selector: "button" })).toBeNull();
      });
    });

    it("SUCCESS → Convert another → SUCCESS", async () => {
      const user = userEvent.setup();

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "out.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      let input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile("first.pdf"));
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-2", files: [{ id: "f2", name: "second.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "second_out.pdf" });

      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("second.pdf"));
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      expect(addActivityEntry).toHaveBeenCalledTimes(2);
    });

    it("SUCCESS → Convert another → FAILURE", async () => {
      const user = userEvent.setup();

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "out.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      let input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile());
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "FAILED", error: "Bad file" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("bad.pdf"));
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Conversion Failed")).toBeTruthy());
      expect(screen.getByText("Bad file")).toBeTruthy();
    });

    it("FAILURE → Convert another → SUCCESS", async () => {
      const user = userEvent.setup();

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "FAILED", error: "Oops" });

      render(<ToolPage tool={MOCK_TOOL} />);
      let input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile());
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Conversion Failed")).toBeTruthy());

      await user.click(screen.getByText("Try again"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "fixed.pdf" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("fixed.pdf"));
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());
    });

    it("CANCEL → Convert another → SUCCESS", async () => {
      const user = userEvent.setup();

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockImplementation((_jobId, onStatus) => {
        return new Promise(() => {
          setTimeout(() => {
            onStatus({ jobId: "job-1", state: "PROCESSING", progress: { percent: 30, stage: "processing" } });
          }, 0);
        });
      });
      vi.mocked(cancelJobApi).mockResolvedValue({ message: "Cancelled" });

      render(<ToolPage tool={MOCK_TOOL} />);
      let input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile());
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Cancel")).toBeTruthy());
      await user.click(screen.getByText("Cancel"));
      await waitFor(() => expect(screen.getByText("Conversion Cancelled")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "ok.pdf" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("ok.pdf"));
      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());
    });
  });

  describe("upload error handling", () => {
    it("shows error when upload fails", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockRejectedValue(new Error("Upload failed (500)"));

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getByText("Conversion Failed")).toBeTruthy();
        expect(screen.getByText("Upload failed (500)")).toBeTruthy();
      });
    });
  });

  describe("accessibility", () => {
    it("announces completion in live region", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "out.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion?.textContent).toContain("Conversion complete");
      });
    });

    it("announces error in live region", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "FAILED", error: "Something broke" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion?.textContent).toContain("Conversion failed");
      });
    });

    it("error state has role=alert", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "FAILED", error: "Error" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    });

    it("cancelled state has role=status", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockImplementation((_jobId, onStatus) => {
        return new Promise(() => {
          setTimeout(() => {
            onStatus({ jobId: "job-1", state: "PROCESSING", progress: { percent: 30, stage: "processing" } });
          }, 0);
        });
      });
      vi.mocked(cancelJobApi).mockResolvedValue({ message: "Cancelled" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));
      await waitFor(() => expect(screen.getByText("Cancel")).toBeTruthy());
      await user.click(screen.getByText("Cancel"));
      await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    });
  });

  describe("result state", () => {
    it("shows result with filename and download button", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "compressed.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.getByText("compressed.pdf")).toBeTruthy();
        expect(screen.getByText("Download")).toBeTruthy();
      });
    });
  });

  describe("file removal", () => {
    it("removes a single selected file and shows dropzone", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("only.pdf"));

      expect(screen.getByText("only.pdf")).toBeTruthy();
      expect(screen.queryByText("Drag & drop files here")).toBeNull();

      const removeBtn = screen.getByRole("button", { name: /Remove only\.pdf/i });
      await user.click(removeBtn);

      expect(screen.queryByText("only.pdf")).toBeNull();
      expect(screen.getByText("Drag & drop files here")).toBeTruthy();
      expect(screen.queryByText("Compress PDF", { selector: "button" })).toBeNull();
    });

    it("removes middle file from multi-file selection", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFiles(input, [makeFile("a.pdf"), makeFile("b.pdf"), makeFile("c.pdf")]);

      expect(screen.getByText("a.pdf")).toBeTruthy();
      expect(screen.getByText("b.pdf")).toBeTruthy();
      expect(screen.getByText("c.pdf")).toBeTruthy();

      const removeBtn = screen.getByRole("button", { name: /Remove b\.pdf/i });
      await user.click(removeBtn);

      expect(screen.getByText("a.pdf")).toBeTruthy();
      expect(screen.queryByText("b.pdf")).toBeNull();
      expect(screen.getByText("c.pdf")).toBeTruthy();
    });

    it("removes first file from multi-file selection", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFiles(input, [makeFile("first.pdf"), makeFile("second.pdf")]);

      const removeBtn = screen.getByRole("button", { name: /Remove first\.pdf/i });
      await user.click(removeBtn);

      expect(screen.queryByText("first.pdf")).toBeNull();
      expect(screen.getByText("second.pdf")).toBeTruthy();
    });

    it("removes last file from multi-file selection", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFiles(input, [makeFile("a.pdf"), makeFile("b.pdf")]);

      const removeBtn = screen.getByRole("button", { name: /Remove b\.pdf/i });
      await user.click(removeBtn);

      expect(screen.getByText("a.pdf")).toBeTruthy();
      expect(screen.queryByText("b.pdf")).toBeNull();
    });

    it("handles duplicate filenames correctly", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFiles(input, [makeFile("doc.pdf"), makeFile("doc.pdf")]);

      const removeBtns = screen.getAllByRole("button", { name: /Remove doc\.pdf/i });
      expect(removeBtns).toHaveLength(2);

      await user.click(removeBtns[0]);

      const remaining = screen.getAllByRole("button", { name: /Remove doc\.pdf/i });
      expect(remaining).toHaveLength(1);
    });

    it("shows action button again after removing a file when under maxFiles", async () => {
      const user = userEvent.setup();
      render(<ToolPage tool={{ ...MOCK_TOOL, maxFiles: 1 }} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile("test.pdf"));
      expect(screen.getByText("Compress PDF", { selector: "button" })).toBeTruthy();

      const removeBtn = screen.getByRole("button", { name: /Remove test\.pdf/i });
      await user.click(removeBtn);

      expect(screen.queryByText("Compress PDF", { selector: "button" })).toBeNull();
      expect(screen.getByText("Drag & drop files here")).toBeTruthy();
    });

    it("does not allow removal during processing", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockImplementation(() => new Promise(() => {}));

      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("test.pdf"));

      await user.click(screen.getByText("Compress PDF", { selector: "button" }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Remove/i })).toBeNull();
      });
    });
  });

  describe("options panel layout", () => {
    it("does not render options panel when no optionsPanel prop provided", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(document.querySelector(".tool-page-options-panel")).toBeNull();
    });

    it("does not show options panel before files are selected", () => {
      const optionsPanel = <div data-testid="options-content">Quality settings</div>;
      render(<ToolPage tool={MOCK_TOOL} optionsPanel={optionsPanel} />);
      expect(screen.queryByTestId("options-content")).toBeNull();
    });

    it("shows options panel after files are selected", () => {
      const optionsPanel = <div data-testid="options-content">Quality settings</div>;
      render(<ToolPage tool={MOCK_TOOL} optionsPanel={optionsPanel} optionsLabel="Settings" />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      expect(screen.getByTestId("options-content")).toBeTruthy();
      expect(screen.getByText("Settings")).toBeTruthy();
    });

    it("shows action button in options panel when optionsPanel is provided", () => {
      const optionsPanel = <div>Quality settings</div>;
      render(<ToolPage tool={MOCK_TOOL} optionsPanel={optionsPanel} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      expect(screen.getByText("Compress PDF", { selector: "button" })).toBeTruthy();
    });

    it("renders bottom ad placeholder", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const adSlot = document.querySelector('[data-ad-placement="tool-bottom"]');
      expect(adSlot).toBeTruthy();
    });

    it("options panel has accessible label", () => {
      const optionsPanel = <div>Content</div>;
      render(<ToolPage tool={MOCK_TOOL} optionsPanel={optionsPanel} optionsLabel="Compression Settings" />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      const aside = document.querySelector('aside[aria-label="Compression Settings"]');
      expect(aside).toBeTruthy();
    });

    it("no empty sidebar when no optionsPanel and no files", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const optionsPanel = document.querySelector(".tool-page-options-panel");
      expect(optionsPanel).toBeNull();
    });
  });
});
