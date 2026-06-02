import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

/**
 * BFF proxy — GET /api/sessions/:sessionId/search-knowledge?q=<query>&top_k=<n>
 *
 * Forwards the request to the backend RAG search endpoint and returns the
 * ranked slide chunks as JSON.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    // pathname: /api/sessions/<sessionId>/search-knowledge
    const sessionId = parts[parts.indexOf("sessions") + 1];

    const q = url.searchParams.get("q") ?? "";
    const topK = url.searchParams.get("top_k") ?? "5";

    if (!q.trim()) {
      return NextResponse.json({ chunks: [] });
    }

    const backendUrl = config.getApiUrl(
      `/api/sessions/${sessionId}/search-knowledge?q=${encodeURIComponent(q)}&top_k=${topK}`
    );

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(
        `search-knowledge backend error: ${response.status} for session ${sessionId}`
      );
      return NextResponse.json(
        { chunks: [], error: "Backend search failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("search-knowledge BFF error:", error);
    return NextResponse.json(
      { chunks: [], error: "Internal server error" },
      { status: 500 }
    );
  }
}
