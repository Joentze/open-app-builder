import { getWritable } from "workflow";
import type { LanguageModel, UIMessageChunk } from "ai";

import { streamText, Output, stepCountIs } from 'ai';
import { z } from 'zod';
import { nanoid } from "nanoid";
import { runCommandResponseHook } from "@/workflows/hooks/run-command-response";
import { logResponseHook } from "@/workflows/hooks/log-response";
import { filesWrittenResponseHook } from "@/workflows/hooks/files-written-response";
import { checkSandboxResponseHook } from "@/workflows/hooks/check-sandbox-response";
import { startSandboxResponseHook } from "@/workflows/hooks/start-sandbox-response";
import { SANDBOX_UPSERT_FILES_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

// Inner step that handles streaming (has "use step")
async function generateFilesStep(prompt: string, toolCallId: string) {
    "use step";
    const writable = getWritable<UIMessageChunk>();
    const writer = writable.getWriter();

    const { elementStream } = streamText({
        model: 'google/gemini-3-flash' as LanguageModel,
        system: SANDBOX_UPSERT_FILES_AGENT_PROMPT,
        output: Output.array({
            element: z.object({
                directory: z.string(),
                content: z.string(),
            }),
        }),
        stopWhen: stepCountIs(10),
        tools: {
            runCommand: {
                inputSchema: z.object({
                    command: z.string(),
                    args: z.array(z.string()),
                    background: z.boolean().optional().describe("Set to true for long-running commands like 'npm run dev' that don't exit on their own"),
                }),
                execute: runCommand,
                outputSchema: z.string(),
            },
        },
        prompt,
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingBudget: 1024,
                    includeThoughts: true,
                },
            } satisfies GoogleGenerativeAIProviderOptions,
        },
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
    await generateFilesStep(prompt, toolCallId);

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

async function checkSandbox({ }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps' - hooks must run in workflow context
    const hook = checkSandboxResponseHook.create({ token: toolCallId });
    const { available } = await hook;
    return available ? "Sandbox is available and ready" : "Sandbox is not available";
}

async function startSandbox({ }, { toolCallId }: { toolCallId: string }) {
    // no use of 'use steps' - hooks must run in workflow context
    const hook = startSandboxResponseHook.create({ token: toolCallId });
    const { success, error } = await hook;
    if (success) {
        return "Sandbox started and mounted successfully";
    }
    return `Failed to start sandbox: ${error || "Unknown error"}`;
}

export { upsertFiles, runCommand, getLogs, checkSandbox, startSandbox };
