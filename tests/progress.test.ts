import { describe, it, expect, vi } from "vitest";
import { ProgressTracker, createProgressTracker } from "../lib/progress";

describe("ProgressTracker", () => {
  it("initializes with defaults", () => {
    const t = new ProgressTracker();
    expect(t.percent).toBe(0);
    expect(t.stage).toBe("queued");
    expect(t.message).toBeUndefined();
    expect(t.current).toBeUndefined();
    expect(t.total).toBeUndefined();
    expect(t.isFinal).toBe(false);
  });

  it("accepts valid percent updates", () => {
    const t = new ProgressTracker();
    t.update({ percent: 50 });
    expect(t.percent).toBe(50);
  });

  it("clamps percent to 0-100", () => {
    const t = new ProgressTracker();
    t.update({ percent: -10 });
    expect(t.percent).toBe(0);
    t.update({ percent: 150 });
    expect(t.percent).toBe(100);
  });

  it("enforces monotonic percent increases", () => {
    const t = new ProgressTracker();
    t.update({ percent: 50 });
    t.update({ percent: 30 });
    expect(t.percent).toBe(50);
    t.update({ percent: 75 });
    expect(t.percent).toBe(75);
  });

  it("accepts equal percent values", () => {
    const t = new ProgressTracker();
    t.update({ percent: 50 });
    t.update({ percent: 50 });
    expect(t.percent).toBe(50);
  });

  it("accepts stage in any order for processing stages", () => {
    const t = new ProgressTracker();
    t.update({ stage: "processing" });
    expect(t.stage).toBe("processing");
    t.update({ stage: "loading" });
    // loading < processing, should be rejected (stage regresses)
    expect(t.stage).toBe("processing");
  });

  it("allows forward stage progression", () => {
    const t = new ProgressTracker();
    t.update({ stage: "validating" });
    t.update({ stage: "queued" });
    t.update({ stage: "loading" });
    t.update({ stage: "processing" });
    t.update({ stage: "finalizing" });
    expect(t.stage).toBe("finalizing");
  });

  it("allows failure from any stage", () => {
    const t = new ProgressTracker();
    t.update({ stage: "processing" });
    t.update({ stage: "failed" });
    expect(t.stage).toBe("failed");
    expect(t.isFinal).toBe(true);
  });

  it("allows cancellation from any stage", () => {
    const t = new ProgressTracker();
    t.update({ stage: "loading" });
    t.update({ stage: "cancelled" });
    expect(t.stage).toBe("cancelled");
    expect(t.isFinal).toBe(true);
  });

  it("sets percent to 100 on complete", () => {
    const t = new ProgressTracker();
    t.update({ percent: 50 });
    t.complete();
    expect(t.percent).toBe(100);
    expect(t.stage).toBe("complete");
    expect(t.isFinal).toBe(true);
  });

  it("ignores updates after final state", () => {
    const t = new ProgressTracker();
    t.complete();
    t.update({ percent: 0 });
    t.update({ stage: "processing" });
    expect(t.percent).toBe(100);
    expect(t.stage).toBe("complete");
  });

  it("sets message", () => {
    const t = new ProgressTracker();
    t.update({ message: "Processing page 5" });
    expect(t.message).toBe("Processing page 5");
  });

  it("tracks current/total", () => {
    const t = new ProgressTracker();
    t.update({ current: 3, total: 10 });
    expect(t.current).toBe(3);
    expect(t.total).toBe(10);
  });

  it("setProgress computes correct percent", () => {
    const t = new ProgressTracker();
    t.setProgress(3, 10);
    expect(t.percent).toBe(30);
    expect(t.current).toBe(3);
    expect(t.total).toBe(10);
  });

  it("setProgress ignores zero total", () => {
    const t = new ProgressTracker();
    t.setProgress(0, 0);
    expect(t.percent).toBe(0);
  });

  it("setProgress ignores negative total", () => {
    const t = new ProgressTracker();
    t.setProgress(5, -1);
    expect(t.percent).toBe(0);
  });

  it("setProgress enforces monotonic percent", () => {
    const t = new ProgressTracker();
    t.setProgress(8, 10);
    expect(t.percent).toBe(80);
    t.setProgress(3, 10);
    expect(t.percent).toBe(80);
  });

  it("fail sets stage and marks final", () => {
    const t = new ProgressTracker();
    t.fail("Something went wrong");
    expect(t.stage).toBe("failed");
    expect(t.message).toBe("Something went wrong");
    expect(t.isFinal).toBe(true);
  });

  it("cancel sets stage and marks final", () => {
    const t = new ProgressTracker();
    t.cancel("User cancelled");
    expect(t.stage).toBe("cancelled");
    expect(t.message).toBe("User cancelled");
    expect(t.isFinal).toBe(true);
  });

  it("snapshot returns current state", () => {
    const t = new ProgressTracker();
    t.update({ percent: 42, stage: "processing", message: "test" });
    const s = t.snapshot();
    expect(s.percent).toBe(42);
    expect(s.stage).toBe("processing");
    expect(s.message).toBe("test");
  });

  it("snapshot is a copy, not a reference", () => {
    const t = new ProgressTracker();
    t.update({ percent: 50 });
    const s = t.snapshot();
    s.percent = 99;
    expect(t.percent).toBe(50);
  });

  it("callback fires on update", () => {
    const cb = vi.fn();
    const t = new ProgressTracker(cb);
    t.update({ percent: 25 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 25 })
    );
  });

  it("callback fires on complete", () => {
    const cb = vi.fn();
    const t = new ProgressTracker(cb);
    t.complete("done");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "complete", percent: 100 })
    );
  });

  it("callback fires on fail", () => {
    const cb = vi.fn();
    const t = new ProgressTracker(cb);
    t.fail("error");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "failed" })
    );
  });

  it("callback does not fire after final", () => {
    const cb = vi.fn();
    const t = new ProgressTracker(cb);
    t.complete();
    cb.mockClear();
    t.update({ percent: 0 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("createProgressTracker factory works", () => {
    const cb = vi.fn();
    const t = createProgressTracker(cb);
    expect(t).toBeInstanceOf(ProgressTracker);
    t.update({ percent: 10 });
    expect(cb).toHaveBeenCalled();
  });

  it("rounds percent values", () => {
    const t = new ProgressTracker();
    t.setProgress(1, 3);
    expect(t.percent).toBe(33);
    t.setProgress(2, 3);
    expect(t.percent).toBe(67);
  });
});
