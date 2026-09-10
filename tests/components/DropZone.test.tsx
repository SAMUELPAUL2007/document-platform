// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DropZone from "@/components/upload/DropZone";

function makeFile(name: string, size = 1024, type = ""): File {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  };
  files.forEach((f, i) => {
    (list as Record<string, unknown>)[String(i)] = f;
  });
  return list as unknown as FileList;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DropZone", () => {
  const defaultProps = {
    accept: ".pdf",
    maxFiles: 5,
    onFilesSelected: vi.fn(),
  };

  it("renders the drop zone label", () => {
    render(<DropZone {...defaultProps} />);
    expect(screen.getByText("Drag & drop files here")).toBeTruthy();
  });

  it("renders file type hint", () => {
    render(<DropZone {...defaultProps} />);
    expect(screen.getByText(/PDF/)).toBeTruthy();
  });

  it("renders max files hint when maxFiles > 1", () => {
    render(<DropZone {...defaultProps} maxFiles={5} />);
    expect(screen.getByText(/max 5 files/)).toBeTruthy();
  });

  it("hides max files hint when maxFiles is 1", () => {
    render(<DropZone {...defaultProps} maxFiles={1} />);
    expect(screen.queryByText(/max 1 files/)).toBeNull();
  });

  it("has accessible role and label", () => {
    render(<DropZone {...defaultProps} />);
    const dropzone = screen.getByRole("button", { name: /Drop files here or click to browse/i });
    expect(dropzone).toBeTruthy();
  });

  it("shows browse files link text", () => {
    render(<DropZone {...defaultProps} />);
    expect(screen.getByText("browse files")).toBeTruthy();
  });

  it("shows error when file input receives invalid file type", () => {
    render(<DropZone {...defaultProps} onFilesSelected={vi.fn()} />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;

    const file = makeFile("test.txt", 100, "text/plain");
    Object.defineProperty(input, "files", { value: makeFileList([file]), configurable: true });
    fireEvent.change(input);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/is not a supported file type/)).toBeTruthy();
  });

  it("shows error when file is oversized", () => {
    render(<DropZone {...defaultProps} onFilesSelected={vi.fn()} />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;

    const file = makeFile("huge.pdf", 200 * 1024 * 1024, "application/pdf");
    Object.defineProperty(input, "files", { value: makeFileList([file]), configurable: true });
    fireEvent.change(input);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/exceeds the/)).toBeTruthy();
  });

  it("shows error when max file count exceeded", () => {
    render(<DropZone {...defaultProps} maxFiles={2} onFilesSelected={vi.fn()} />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;

    const files = [
      makeFile("a.pdf", 100, "application/pdf"),
      makeFile("b.pdf", 100, "application/pdf"),
      makeFile("c.pdf", 100, "application/pdf"),
    ];
    Object.defineProperty(input, "files", { value: makeFileList(files), configurable: true });
    fireEvent.change(input);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Maximum 2 files allowed/)).toBeTruthy();
  });

  it("clears error when valid files are selected after rejection", () => {
    const onFilesSelected = vi.fn();
    render(<DropZone {...defaultProps} onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;

    const badFile = makeFile("test.txt", 100, "text/plain");
    Object.defineProperty(input, "files", { value: makeFileList([badFile]), configurable: true });
    fireEvent.change(input);
    expect(screen.getByRole("alert")).toBeTruthy();

    const goodFile = makeFile("test.pdf", 100, "application/pdf");
    Object.defineProperty(input, "files", { value: makeFileList([goodFile]), configurable: true });
    fireEvent.change(input);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("calls onFilesSelected when valid file is provided", () => {
    const onFilesSelected = vi.fn();
    render(<DropZone {...defaultProps} onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText("Upload files") as HTMLInputElement;

    const file = makeFile("test.pdf", 1024, "application/pdf");
    Object.defineProperty(input, "files", { value: makeFileList([file]), configurable: true });
    fireEvent.change(input);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("supports drag and drop", () => {
    const onFilesSelected = vi.fn();
    render(<DropZone {...defaultProps} onFilesSelected={onFilesSelected} />);
    const dropzone = screen.getByRole("button", { name: /Drop files here or click to browse/i });

    const file = makeFile("test.pdf", 1024, "application/pdf");
    const dt = { files: makeFileList([file]), types: ["Files"] };

    fireEvent.dragEnter(dropzone, { dataTransfer: dt as unknown as DataTransfer });
    fireEvent.dragOver(dropzone, { dataTransfer: dt as unknown as DataTransfer });
    fireEvent.drop(dropzone, { dataTransfer: dt as unknown as DataTransfer });

    expect(onFilesSelected).toHaveBeenCalled();
  });
});
