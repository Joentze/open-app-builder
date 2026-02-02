import { DurableAgent } from "@workflow/ai/agent";
import { getWritable, fetch } from "workflow";
import type { ModelMessage, UIMessageChunk } from "ai";
import { checkSandbox, getLogs, runCommand, startSandbox, upsertFiles } from "./tools/steps";
import z from "zod";
import { SANDBOX_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";


export async function chatWorkflow(messages: ModelMessage[]) {
    "use workflow";
    const writable = getWritable<UIMessageChunk>();
    globalThis.fetch = fetch;
    const agent = new DurableAgent({
        model: "google/gemini-3-flash",
        system: SANDBOX_AGENT_PROMPT,
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
            startSandbox: {
                inputSchema: z.object({
                    type: z.enum(["vite", "next"]),
                }),
                outputSchema: z.string(),
                execute: startSandbox,
            },
            checkSandbox: {
                inputSchema: z.object({}),
                outputSchema: z.string(),
                execute: checkSandbox,
            },
        },
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingBudget: 1024,
                    includeThoughts: true,
                },
            } satisfies GoogleGenerativeAIProviderOptions,
        },
    });
    await agent.stream({
        messages,
        writable,
    });
}