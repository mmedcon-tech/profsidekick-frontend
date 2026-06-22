import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend URL not configured" }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/ai/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tells nginx which backend to route to — critical for server-side requests
        // that don't carry an Origin header.
        "X-Frontend-Instance": process.env.NEXT_PUBLIC_FRONTEND_INSTANCE ?? "main",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Error in /chat/completions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
