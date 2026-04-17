import { NextResponse } from "next/server";
import {
  createSSEStream,
  type RequestContext,
  type TaskArtifactUpdateEvent,
  type TaskStatusUpdateEvent,
} from "@a2x/sdk";
import { handler } from "@/lib/a2x-setup";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null,
      },
      { status: 400 },
    );
  }

  const context: RequestContext = {
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(new URL(request.url).searchParams.entries()),
  };

  const result = await handler.handle(body, context);

  if (
    result &&
    typeof result === "object" &&
    Symbol.asyncIterator in (result as object)
  ) {
    const stream = createSSEStream(
      result as AsyncGenerator<
        TaskStatusUpdateEvent | TaskArtifactUpdateEvent
      >,
    );
    return new Response(stream, { headers: SSE_HEADERS });
  }

  return NextResponse.json(result);
}
