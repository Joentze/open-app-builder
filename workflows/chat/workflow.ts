import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import type { ModelMessage, UIMessageChunk } from "ai";
import { getLogs, runCommand, upsertFiles } from "./tools/steps";
import z from "zod";


export async function chatWorkflow(messages: ModelMessage[]) {
    "use workflow";
    const writable = getWritable<UIMessageChunk>();
    const agent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: "You are a helpful assistant.",
        tools: {
            runCommand: {
                inputSchema: z.object({
                    command: z.string(),
                    args: z.array(z.string()),
                }),
                execute: runCommand,
                outputSchema: z.string(),
            },
            upsertFiles: {
                inputSchema: z.object({
                    prompt: z.string(),
                }),
                outputSchema: z.string(),
                execute: upsertFiles,
            },
            getLogs: {
                inputSchema: z.object({}),
                outputSchema: z.string(),
                execute: getLogs,
            },
        },
    });
    await agent.stream({
        messages,
        writable,
    });
}