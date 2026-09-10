// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProcessingUI from "@/components/upload/ProcessingUI";

describe("ProcessingUI", () => {
  const defaultSnapshot = {
    percent: 50,
    stage: "processing" as const,
  };

  it("renders uploading status text", () => {
    render(
      <ProcessingUI status="uploading" progress={25} />
    );
    expect(screen.getByText("Uploading your file...")).toBeTruthy();
  });

  it("renders processing status text with stage label", () => {
    render(
      <ProcessingUI status="processing" progress={60} progressSnapshot={defaultSnapshot} />
    );
    expect(screen.getByText("Processing")).toBeTruthy();
  });

  it("displays progress percentage in the circular indicator", () => {
    render(
      <ProcessingUI status="processing" progress={75} />
    );
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("displays snapshot percent when provided", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={30}
        progressSnapshot={{ percent: 80, stage: "processing" }}
      />
    );
    expect(screen.getByText("80%")).toBeTruthy();
  });

  it("renders progressbar with correct attributes", () => {
    render(
      <ProcessingUI status="processing" progress={50} />
    );
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("50");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("shows cancel button when canCancel and onCancel are provided", () => {
    const onCancel = vi.fn();
    render(
      <ProcessingUI status="processing" progress={50} onCancel={onCancel} canCancel={true} />
    );
    const cancelBtn = screen.getByText("Cancel processing");
    expect(cancelBtn).toBeTruthy();
  });

  it("hides cancel button when canCancel is false", () => {
    const onCancel = vi.fn();
    render(
      <ProcessingUI status="processing" progress={50} onCancel={onCancel} canCancel={false} />
    );
    expect(screen.queryByText("Cancel processing")).toBeNull();
  });

  it("hides cancel button when onCancel is not provided", () => {
    render(
      <ProcessingUI status="processing" progress={50} canCancel={true} />
    );
    expect(screen.queryByText("Cancel processing")).toBeNull();
  });

  it("shows custom message from snapshot", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={50}
        progressSnapshot={{ percent: 50, stage: "processing", message: "Processing page 3 of 10" }}
      />
    );
    expect(screen.getByText("Processing page 3 of 10")).toBeTruthy();
  });

  it("shows current/total from snapshot", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={30}
        progressSnapshot={{ percent: 30, stage: "processing", current: 3, total: 10 }}
      />
    );
    expect(screen.getByText("3 / 10 units")).toBeTruthy();
  });

  it("shows validating stage label", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={10}
        progressSnapshot={{ percent: 10, stage: "validating" }}
      />
    );
    expect(screen.getByText("Validating file")).toBeTruthy();
  });

  it("shows loading stage label", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={20}
        progressSnapshot={{ percent: 20, stage: "loading" }}
      />
    );
    expect(screen.getByText("Loading document")).toBeTruthy();
  });

  it("shows finalizing stage label", () => {
    render(
      <ProcessingUI
        status="processing"
        progress={90}
        progressSnapshot={{ percent: 90, stage: "finalizing" }}
      />
    );
    expect(screen.getByText("Saving output")).toBeTruthy();
  });
});
