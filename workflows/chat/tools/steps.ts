import { getWritable } from "workflow";
import type { LanguageModel, UIMessageChunk } from "ai";

import { streamText, Output } from 'ai';
import { z } from 'zod';
import { nanoid } from "nanoid";
import { runCommandResponseHook } from "@/workflows/hooks/run-command-response";
import { logResponseHook } from "@/workflows/hooks/log-response";
import { filesWrittenResponseHook } from "@/workflows/hooks/files-written-response";

// Inner step that handles streaming (has "use step")
async function generateFilesStep(prompt: string, toolCallId: string) {
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

    const response: Array<{ directory: string; content: string }> = [];
    for await (const element of elementStream) {
        const elementId = nanoid(10);
        await writer.write({
            id: `${toolCallId}-${elementId}`,
            type: "data-file-upsert",
            data: element,
        });
        response.push({ ...element });
    }

    // Signal to frontend: all files generated, please write to sandbox
    await writer.write({
        id: toolCallId,
        type: "data-upsert-all-files",
        data: response,
    });

    return response;
}

// Outer workflow function (NO "use step") - can use hooks
async function upsertFiles({ prompt }: { prompt: string }, { toolCallId }: { toolCallId: string }) {
    // NO "use step" here - this is workflow context

    // Call the step to stream files to frontend
    const files = await generateFilesStep(prompt, toolCallId);

    // Now in workflow context - create hook and wait for frontend confirmation
    const hook = filesWrittenResponseHook.create({ token: toolCallId });
    const { files: confirmedFiles } = await hook;

    // Workflow resumes here after frontend confirms files were written to sandbox
    const successCount = confirmedFiles.filter(f => f.success).length;
    return `Created ${successCount}/${confirmedFiles.length} files: ${confirmedFiles.map(f => f.directory).join(", ")}`;
}

async function runCommand({ command, args, background = false }: { command: string, args: string[], background?: boolean }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps', see here: https://useworkflow.dev/docs/ai/human-in-the-loop
    // Note: getWritable() is NOT available in workflow functions (without "use step")
    // Hooks must run in workflow context, so we cannot use getWritable here
    const hook = runCommandResponseHook.create({ token: toolCallId });
    // Workflow pauses here until the hook is resolved
    const { response } = await hook;

    if (background) {
        return `Command '${command} ${args.join(" ")}' started in background. Initial output: '${response}'`;
    }
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
