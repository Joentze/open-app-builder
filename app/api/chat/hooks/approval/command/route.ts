import { runCommandResponseHook } from "@/workflows/hooks/run-command-response";

export async function POST(request: Request) {
    const { toolCallId, command, args, response } = await request.json();
    try {
        await runCommandResponseHook.resume(toolCallId, {
            command,
            args,
            response,
        });
        return Response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        return Response.json({ success: false, error: (error as Error).message });
    }
}