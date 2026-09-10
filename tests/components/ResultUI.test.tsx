// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultUI from "@/components/upload/ResultUI";

describe("ResultUI", () => {
  it("renders the default heading", () => {
    render(
      <ResultUI toolName="Compress PDF" onReset={vi.fn()} />
    );
    expect(screen.getByText("Processing Complete")).toBeTruthy();
  });

  it("renders custom heading when provided", () => {
    render(
      <ResultUI toolName="Compress PDF" heading="Compression Done" onReset={vi.fn()} />
    );
    expect(screen.getByText("Compression Done")).toBeTruthy();
  });

  it("renders tool name in description", () => {
    render(
      <ResultUI toolName="Merge PDF" onReset={vi.fn()} />
    );
    expect(screen.getByText(/Merge PDF/)).toBeTruthy();
  });

  it("renders filename when provided", () => {
    render(
      <ResultUI toolName="Compress PDF" fileName="output_compressed.pdf" onReset={vi.fn()} />
    );
    expect(screen.getByText("output_compressed.pdf")).toBeTruthy();
  });

  it("does not render filename when not provided", () => {
    render(
      <ResultUI toolName="Compress PDF" onReset={vi.fn()} />
    );
    expect(screen.queryByText(".pdf")).toBeNull();
  });

  it("renders download button when onDownload is provided", () => {
    const onDownload = vi.fn();
    render(
      <ResultUI toolName="Compress PDF" onDownload={onDownload} onReset={vi.fn()} />
    );
    expect(screen.getByText("Download")).toBeTruthy();
  });

  it("hides download button when onDownload is not provided", () => {
    render(
      <ResultUI toolName="Compress PDF" onReset={vi.fn()} />
    );
    expect(screen.queryByText("Download")).toBeNull();
  });

  it("renders Process Another File button", () => {
    render(
      <ResultUI toolName="Compress PDF" onReset={vi.fn()} />
    );
    expect(screen.getByText("Process Another File")).toBeTruthy();
  });

  it("calls onReset when Process Another File is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <ResultUI toolName="Compress PDF" onReset={onReset} />
    );
    await user.click(screen.getByText("Process Another File"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("calls onDownload when Download is clicked", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(
      <ResultUI toolName="Compress PDF" onDownload={onDownload} onReset={vi.fn()} />
    );
    await user.click(screen.getByText("Download"));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("has role=status for accessibility", () => {
    render(
      <ResultUI toolName="Compress PDF" onReset={vi.fn()} />
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("download button has accessible label with filename", () => {
    render(
      <ResultUI
        toolName="Compress PDF"
        fileName="result.pdf"
        onDownload={vi.fn()}
        onReset={vi.fn()}
      />
    );
    const downloadBtn = screen.getByRole("button", { name: /Download result\.pdf/i });
    expect(downloadBtn).toBeTruthy();
  });
});
