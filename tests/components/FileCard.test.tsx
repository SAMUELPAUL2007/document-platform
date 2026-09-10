// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileCard from "@/components/upload/FileCard";

function makeFile(name: string, size = 1024, type = ""): File {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

beforeEach(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
});

describe("FileCard", () => {
  it("renders filename", () => {
    const file = makeFile("document.pdf", 2048);
    render(<FileCard file={file} />);
    expect(screen.getByText("document.pdf")).toBeTruthy();
  });

  it("renders file size formatted", () => {
    const file = makeFile("document.pdf", 2048);
    render(<FileCard file={file} />);
    expect(screen.getByText("2.0 KB")).toBeTruthy();
  });

  it("renders extension badge for non-image files", () => {
    const file = makeFile("report.docx");
    render(<FileCard file={file} />);
    expect(screen.getByText("docx")).toBeTruthy();
  });

  it("renders pending status label by default", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} />);
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("renders uploading status label", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="uploading" progress={50} />);
    expect(screen.getByText("Uploading")).toBeTruthy();
  });

  it("renders processing status label", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="processing" progress={75} />);
    expect(screen.getByText("Processing")).toBeTruthy();
  });

  it("renders complete status with checkmark", () => {
    const file = makeFile("test.pdf");
    const { container } = render(<FileCard file={file} status="complete" />);
    expect(screen.getByText("Done")).toBeTruthy();
    expect(container.querySelector(".text-success")).toBeTruthy();
  });

  it("renders error status", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="error" />);
    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("shows progress bar when uploading", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="uploading" progress={60} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("60");
  });

  it("shows progress bar when processing", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="processing" progress={80} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("80");
  });

  it("hides progress bar when pending", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="pending" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows remove button when pending and onRemove provided", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="pending" onRemove={onRemove} />);
    const removeBtn = screen.getByRole("button", { name: /Remove test\.pdf/i });
    expect(removeBtn).toBeTruthy();
    await user.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("hides remove button when uploading", () => {
    const onRemove = vi.fn();
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="uploading" onRemove={onRemove} />);
    expect(screen.queryByRole("button", { name: /Remove/i })).toBeNull();
  });

  it("hides remove button when onRemove is not provided", () => {
    const file = makeFile("test.pdf");
    render(<FileCard file={file} status="pending" />);
    expect(screen.queryByRole("button", { name: /Remove/i })).toBeNull();
  });

  it("renders image thumbnail for image files", () => {
    const file = makeFile("photo.jpg", 4096, "image/jpeg");
    const { container } = render(<FileCard file={file} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("alt")).toBe("Preview of photo.jpg");
  });

  it("does not render image thumbnail for PDF files", () => {
    const file = makeFile("document.pdf", 4096, "application/pdf");
    const { container } = render(<FileCard file={file} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
