import { runCommandResponseHook } from "@/workflows/hooks/run-command-response";

export async function POST(request: Request) {
    const { toolCallId, response } = await request.json();
    // Schema validation happens automatically
    // Can throw a zod schema validation error, or a
    await runCommandResponseHook.resume(toolCallId, {
        response,
    });
    return Response.json({ success: true });
}