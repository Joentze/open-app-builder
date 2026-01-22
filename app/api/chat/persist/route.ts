import type { UIMessage } from "ai";
import { convertToModelMessages, createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";
import { chatWorkflow } from "@/workflows/chat/workflow";

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const modelMessages = await convertToModelMessages(messages);
    const run = await start(chatWorkflow, [modelMessages]);
    return createUIMessageStreamResponse({
        stream: run.readable,
        headers: {
            "x-workflow-run-id": run.runId,
        },
    });
}