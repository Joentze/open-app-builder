import { getWritable } from "workflow";
import type { LanguageModel, UIMessageChunk } from "ai";

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
        model: 'anthropic/claude-haiku-4.5' as LanguageModel,
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

async function runCommand({ command, args }: { command: string, args: string[] }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps', see here: https://useworkflow.dev/docs/ai/human-in-the-loop
    // Note: getWritable() is NOT available in workflow functions (without "use step")
    // Hooks must run in workflow context, so we cannot use getWritable here
    const hook = runCommandResponseHook.create({ token: toolCallId });
    // Workflow pauses here until the hook is resolved
    const { response } = await hook;

    return `Response from command: '${command} ${args.join(" ")}' is '${response}'`;
}
async function getLogs({ }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps' - hooks must run in workflow context
    // Note: getWritable() is NOT available in workflow functions (without "use step")
    const hook = logResponseHook.create({ token: toolCallId });
    const { logs } = await hook;
    return `Logs: ${logs.map(({ message }) => message).join("\n")}`;
}
export { upsertFiles, runCommand, getLogs };
