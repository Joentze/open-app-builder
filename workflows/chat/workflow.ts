import { DurableAgent } from "@workflow/ai/agent";
import { getWritable, fetch } from "workflow";
import type { ModelMessage, UIMessageChunk } from "ai";
import { checkSandbox, getLogs, runCommand, startSandbox, upsertFiles } from "./tools/steps";
import z from "zod";
import { SANDBOX_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";


export async function chatWorkflow(messages: ModelMessage[]) {
    "use workflow";
    const writable = getWritable<UIMessageChunk>();
    globalThis.fetch = fetch;

    let commandTrace: string[] = [];
    const agent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: SANDBOX_AGENT_PROMPT,
        tools: {
            runCommand: {
                inputSchema: z.object({
                    command: z.string(),
                    args: z.array(z.string()),
                    background: z.boolean().optional().describe("Set to true for long-running commands like 'npm run dev' that don't exit on their own"),
                }),
                execute: async (args, toolData) => {
                    const response = await runCommand(args, { toolCallId: toolData.toolCallId })
                    commandTrace.push(response)
                    return response
                },
                outputSchema: z.string(),
            },
            upsertFiles: {
                inputSchema: z.object({
                    prompt: z.string(),
                }),
                outputSchema: z.string(),
                description: `Use this tool to upsert files in the sandbox, use the prompt to describe in detail, 
                what kind of styling/features/components it should have, and what kind of layout it should have, 
                detail the style guidelines as well. If you are inserting/updating a file, explicityly mention
                in the prompt. If user wants to update a file, use runCommand tool to get the current contents of the file.
                and then use the upsertFiles tool to update the file.`,
                execute: async ({ prompt }, toolData) => { return await upsertFiles({ prompt, commandTrace }, toolData) },
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

    });
    await agent.stream({
        messages,
        writable,
    });
}