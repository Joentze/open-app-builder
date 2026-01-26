import { logResponseHook } from "@/workflows/hooks/log-response";

export async function POST(request: Request) {
    const { toolCallId, logs } = await request.json();
    // Schema validation happens automatically
    // Can throw a zod schema validation error, or a
    await logResponseHook.resume(toolCallId, {
        logs,
    });
    return Response.json({ success: true });
}