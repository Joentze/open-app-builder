import { checkSandboxResponseHook } from "@/workflows/hooks/check-sandbox-response";

export async function POST(request: Request) {
    const { toolCallId, available } = await request.json();
    try {
        await checkSandboxResponseHook.resume(toolCallId, {
            available,
        });
        return Response.json({ success: true });
    } catch (error) {
        console.error(error);
        return Response.json({ success: false, error: (error as Error).message });
    }
}

