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

    it("does not show convert button when no files selected", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(screen.queryByText("Convert")).toBeNull();
    });

    it("renders how it works section", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      expect(screen.getByText("How it works")).toBeTruthy();
    });

    it("has screen reader live region", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });
  });

  describe("file selection", () => {
    it("shows convert button after file is selected", () => {
      render(<ToolPage tool={MOCK_TOOL} />);
      const input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile());
      expect(screen.getByText("Convert")).toBeTruthy();
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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));

      await waitFor(() => {
        expect(screen.getByText("Cancel processing")).toBeTruthy();
      });

      await user.click(screen.getByText("Cancel processing"));

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

      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));

      await waitFor(() => {
        expect(screen.getByText("Drag & drop files here")).toBeTruthy();
        expect(screen.queryByText("Your file is ready")).toBeNull();
        expect(screen.queryByText("Convert")).toBeNull();
      });
    });

    it("SUCCESS → Convert another → SUCCESS", async () => {
      const user = userEvent.setup();

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-1", files: [{ id: "f1", name: "test.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-1", state: "COMPLETED", resultFileName: "out.pdf" });

      render(<ToolPage tool={MOCK_TOOL} />);
      let input = screen.getByLabelText("Upload files") as HTMLInputElement;

      selectFile(input, makeFile("first.pdf"));
      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(uploadFiles).mockResolvedValue({ jobId: "job-2", files: [{ id: "f2", name: "second.pdf", size: 1024 }] });
      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "second_out.pdf" });

      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("second.pdf"));
      await user.click(screen.getByText("Convert"));
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
      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Your file is ready")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "FAILED", error: "Bad file" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("bad.pdf"));
      await user.click(screen.getByText("Convert"));
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
      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Conversion Failed")).toBeTruthy());

      await user.click(screen.getByText("Try again"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "fixed.pdf" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("fixed.pdf"));
      await user.click(screen.getByText("Convert"));
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
      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Cancel processing")).toBeTruthy());
      await user.click(screen.getByText("Cancel processing"));
      await waitFor(() => expect(screen.getByText("Conversion Cancelled")).toBeTruthy());

      await user.click(screen.getByText("Convert another file"));
      await waitFor(() => expect(screen.getByText("Drag & drop files here")).toBeTruthy());

      vi.mocked(pollJobStatus).mockResolvedValue({ jobId: "job-2", state: "COMPLETED", resultFileName: "ok.pdf" });
      input = screen.getByLabelText("Upload files") as HTMLInputElement;
      selectFile(input, makeFile("ok.pdf"));
      await user.click(screen.getByText("Convert"));
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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));

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

      await user.click(screen.getByText("Convert"));
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

      await user.click(screen.getByText("Convert"));
      await waitFor(() => expect(screen.getByText("Cancel processing")).toBeTruthy());
      await user.click(screen.getByText("Cancel processing"));
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

      await user.click(screen.getByText("Convert"));

      await waitFor(() => {
        expect(screen.getByText("compressed.pdf")).toBeTruthy();
        expect(screen.getByText("Download")).toBeTruthy();
      });
    });
  });
});
