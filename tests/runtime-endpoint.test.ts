import { describe, it, expect } from "vitest";

describe("GET /api/runtime", () => {
  it("returns node version, Promise.withResolvers type, platform, and arch", async () => {
    const res = await fetch("http://localhost:3000/api/runtime");
    expect(res.ok).toBe(true);

    const body = await res.json();

    expect(typeof body.nodeVersion).toBe("string");
    expect(body.nodeVersion).toMatch(/^v\d+\./);

    expect(typeof body.promiseWithResolvers).toBe("string");
    expect(body.promiseWithResolvers).toBe("function");

    expect(typeof body.platform).toBe("string");
    expect(typeof body.arch).toBe("string");
  });
});
