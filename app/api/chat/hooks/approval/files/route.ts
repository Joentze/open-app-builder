import { filesWrittenResponseHook } from "@/workflows/hooks/files-written-response";

export async function POST(request: Request) {
    const { toolCallId, files } = await request.json();
    try {
        await filesWrittenResponseHook.resume(toolCallId, {
            files,
        });
        return Response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        return Response.json({ success: false, error: (error as Error).message });
    }
}

