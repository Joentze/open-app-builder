import { startSandboxResponseHook } from "@/workflows/hooks/start-sandbox-response";

export async function POST(request: Request) {
    const { toolCallId, success, error } = await request.json();
    try {
        await startSandboxResponseHook.resume(toolCallId, {
            success,
            error,
        });
        return Response.json({ success: true });
    } catch (err) {
        console.error(err);
        return Response.json({ success: false, error: (err as Error).message });
    }
}

