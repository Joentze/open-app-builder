import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";

import { streamText, Output } from 'ai';
import { z } from 'zod';
import { nanoid } from "nanoid";
import { runCommandResponseHook } from "@/workflows/hooks/run-command-response";
import { logResponseHook } from "@/workflows/hooks/log-response";

async function upsertFiles({ prompt }: { prompt: string }, { toolCallId }: { toolCallId: string }) {
    "use step";
    const writable = getWritable<UIMessageChunk>();
    const writer = writable.getWriter();
    const { elementStream } = streamText({
        model: 'anthropic/claude-haiku-4.5' as any,
        output: Output.array({
            element: z.object({
                directory: z.string(),
                content: z.string(),
            }),
        }),
        prompt,
    });
    const response = []
    for await (const element of elementStream) {
        const elementId = nanoid(10);
        await writer.write({
            id: `${toolCallId}-${elementId}`,
            type: "data-file-upsert",
            data: element,
        });
        response.push({
            ...element,
        });
    }
    const directories = response.map(({ directory }) => directory).join(",");
    return `Created files at: ${directories}`;
}

async function runCommand({ command }: { command: string }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps', see here: https://useworkflow.dev/docs/ai/human-in-the-loop
    const writable = getWritable<UIMessageChunk>();
    const writer = writable.getWriter();
    const hook = runCommandResponseHook.create({ token: toolCallId });
    // Workflow pauses here until the hook is resolved
    const { response } = await hook;

    return `Response from command: '${command}' is '${response}'`;

}
async function getLogs({ }, { toolCallId }: { toolCallId: string }) {
    "use step";
    const writable = getWritable<UIMessageChunk>();
    const writer = writable.getWriter();
    const hook = logResponseHook.create({ token: toolCallId });
    const { logs } = await hook;
    return `Logs: ${logs.map(({ message }) => message).join("\n")}`;
}
export { upsertFiles, runCommand, getLogs };
