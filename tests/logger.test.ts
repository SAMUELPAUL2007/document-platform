import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, generateRequestId, createChildLogger } from "../lib/logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages as JSON", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { event: "test" });
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("info");
    expect(output.msg).toBe("test message");
    expect(output.event).toBe("test");
    expect(output.ts).toBeDefined();
  });

  it("logs error messages to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("something failed", { jobId: "123" });
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("error");
    expect(output.jobId).toBe("123");
  });

  it("logs warn messages to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("heads up");
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("warn");
  });

  it("redacts sensitive fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("auth", { password: "secret123", token: "abc" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.password).toBe("***");
    expect(output.token).toBe("***");
  });

  it("truncates long string values", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const longStr = "x".repeat(300);
    logger.info("long", { data: longStr });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.data.length).toBeLessThan(300);
    expect(output.data).toContain("truncated");
  });

  it("includes duration when provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("done", { duration: 1234, status: "completed" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.duration).toBe(1234);
    expect(output.status).toBe("completed");
  });
});

describe("generateRequestId", () => {
  it("returns a UUID string", () => {
    const id = generateRequestId();
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("returns unique IDs on successive calls", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });
});

describe("createChildLogger", () => {
  it("includes requestId in all log calls", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const child = createChildLogger("req-123");
    child.info("test", { event: "test" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.requestId).toBe("req-123");
    expect(output.event).toBe("test");
  });

  it("child logger error includes requestId", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const child = createChildLogger("req-err");
    child.error("fail", { jobId: "j1" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.requestId).toBe("req-err");
    expect(output.jobId).toBe("j1");
  });

  it("child logger warn includes requestId", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const child = createChildLogger("req-warn");
    child.warn("warning", { toolId: "ocr-pdf" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.requestId).toBe("req-warn");
    expect(output.toolId).toBe("ocr-pdf");
  });

  it("child logger debug includes requestId", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const child = createChildLogger("req-dbg");
    child.debug("debug msg", { extra: "data" });
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.requestId).toBe("req-dbg");
    expect(output.extra).toBe("data");
  });
});
