import { logResponseHook } from "@/workflows/hooks/log-response";

export async function POST(request: Request) {
    const { toolCallId, logs } = await request.json();
    try {
        await logResponseHook.resume(toolCallId, {
            logs: logs.logs,
        });
        return Response.json({ success: true });
    } catch (error) {
        console.error(error);
        return Response.json({ success: false, error: (error as Error).message });
    }
}