import { createUIMessageStreamResponse } from "ai";
import { getRun } from "workflow/api";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    // Client provides the last chunk index they received
    const startIndexParam = searchParams.get("startIndex");
    const startIndex = startIndexParam
        ? parseInt(startIndexParam, 10)
        : undefined;
    // Instead of starting a new run, we fetch an existing run.
    const run = getRun(id);
    const stream = run.getReadable({ startIndex });
    return createUIMessageStreamResponse({ stream });
}