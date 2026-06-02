/**
 * Tests: searchKnowledge + citeSlide RAG tools.
 *
 * Covers:
 *  - Tool definition completeness in teachingAssistant.ts
 *  - KnowledgeChunk / CitedSource type shapes
 *  - BFF route handler behaviour (mocked fetch)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { teachingAssistant } from "@/constants/teachingAssistant";


// Tool definition tests


describe("teachingAssistant tools", () => {
  const toolNames = teachingAssistant.tools.map((t) => t.name);

  it("includes all five expected tools", () => {
    expect(toolNames).toContain("nextSlide");
    expect(toolNames).toContain("previousSlide");
    expect(toolNames).toContain("goToSlide");
    expect(toolNames).toContain("searchKnowledge");
    expect(toolNames).toContain("citeSlide");
  });

  it("searchKnowledge has required 'query' parameter", () => {
    const tool = teachingAssistant.tools.find((t) => t.name === "searchKnowledge");
    expect(tool).toBeDefined();
    expect(tool!.parameters.required).toContain("query");
    expect(tool!.parameters.properties.query.type).toBe("string");
    expect(tool!.parameters.additionalProperties).toBe(false);
  });

  it("citeSlide has required 'slideNumber' parameter", () => {
    const tool = teachingAssistant.tools.find((t) => t.name === "citeSlide");
    expect(tool).toBeDefined();
    expect(tool!.parameters.required).toContain("slideNumber");
    expect(tool!.parameters.properties.slideNumber.type).toBe("number");
    expect(tool!.parameters.additionalProperties).toBe(false);
  });

  it("all tools have type === 'function'", () => {
    teachingAssistant.tools.forEach((tool) => {
      expect(tool.type).toBe("function");
    });
  });
});


// BFF route handler tests


// Import the route handler once at module level (vitest caches modules)
import { GET } from "@/app/api/sessions/[sessionId]/search-knowledge/route";

describe("GET /api/sessions/[sessionId]/search-knowledge route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty chunks for empty query without calling backend", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const req = new Request(
      "http://localhost/api/sessions/abc123/search-knowledge?q="
    );
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.chunks).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies the query to the backend and returns chunks", async () => {
    const mockChunks = [
      { slide_number: 2, chunk_index: 0, content: "Neural networks", score: 0.9 },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chunks: mockChunks }),
    } as Response);

    const req = new Request(
      "http://localhost/api/sessions/abc123/search-knowledge?q=neural+networks"
    );
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.chunks).toHaveLength(1);
    expect(body.chunks[0].slide_number).toBe(2);
    const calledUrl = (global.fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("neural");
  });

  it("returns error response when backend is unavailable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const req = new Request(
      "http://localhost/api/sessions/abc123/search-knowledge?q=test"
    );
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.chunks).toEqual([]);
    expect(body.error).toBeDefined();
  });
});


// Type shape tests


describe("KnowledgeChunk and CitedSource types", () => {
  it("KnowledgeChunk has the expected fields", () => {
    // TypeScript compile-time check — if this compiles, the type is correct.
    const chunk: import("@/types/types").KnowledgeChunk = {
      slide_number: 1,
      chunk_index: 0,
      content: "some text",
      score: 0.85,
    };
    expect(chunk.slide_number).toBe(1);
    expect(chunk.score).toBe(0.85);
  });

  it("KnowledgeChunk score can be null (no pgvector fallback case)", () => {
    const chunk: import("@/types/types").KnowledgeChunk = {
      slide_number: 2,
      chunk_index: 0,
      content: "fallback result",
      score: null,
    };
    expect(chunk.score).toBeNull();
  });

  it("CitedSource has slideNumber and citedAt fields", () => {
    const cited: import("@/types/types").CitedSource = {
      slideNumber: 3,
      citedAt: Date.now(),
    };
    expect(cited.slideNumber).toBe(3);
    expect(typeof cited.citedAt).toBe("number");
  });
});
