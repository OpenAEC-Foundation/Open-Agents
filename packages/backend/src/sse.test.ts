import { describe, it, expect, vi } from "vitest";
import { SSE_HEADERS, sseWrite } from "./sse.js";

describe("SSE_HEADERS", () => {
  it("has correct Content-Type", () => {
    expect(SSE_HEADERS["Content-Type"]).toBe("text/event-stream");
  });

  it("disables caching", () => {
    expect(SSE_HEADERS["Cache-Control"]).toBe("no-cache");
  });

  it("sets keep-alive", () => {
    expect(SSE_HEADERS["Connection"]).toBe("keep-alive");
  });

  it("allows all origins", () => {
    expect(SSE_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("disables nginx buffering", () => {
    expect(SSE_HEADERS["X-Accel-Buffering"]).toBe("no");
  });
});

describe("sseWrite", () => {
  it("writes JSON-formatted SSE event with double newline", () => {
    const write = vi.fn();
    const mockRaw = { write } as unknown as import("node:http").ServerResponse;
    const event = { type: "step:start", nodeId: "n1" };

    sseWrite(mockRaw, event);

    expect(write).toHaveBeenCalledOnce();
    const written = write.mock.calls[0][0] as string;
    expect(written).toMatch(/^data: .+\n\n$/);
    expect(JSON.parse(written.replace("data: ", "").trim())).toEqual(event);
  });

  it("serializes nested data correctly", () => {
    const write = vi.fn();
    const mockRaw = { write } as unknown as import("node:http").ServerResponse;
    const event = {
      type: "step:complete",
      data: { nested: true, count: 42 },
    };

    sseWrite(mockRaw, event);

    const written = write.mock.calls[0][0] as string;
    const parsed = JSON.parse(written.replace("data: ", "").trim());
    expect(parsed.type).toBe("step:complete");
    expect(parsed.data).toEqual({ nested: true, count: 42 });
  });
});
