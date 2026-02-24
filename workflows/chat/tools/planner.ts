import { createCheckSandboxTool, createRunCommandTool, createStartSandboxTool } from "@/workflows/utils/tools/coding-tools";
import { DurableAgent } from "@workflow/ai/agent";
import { hasToolCall, type ModelMessage, type UIMessageChunk } from "ai";
import z from "zod";
import { PLANNER_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";

async function planner({ messages, writable, commandTrace }: { messages: ModelMessage[], writable: WritableStream<UIMessageChunk>, commandTrace: string[] }) {
    let retPlan: { taskTitle: string, instructions: string, type: "db" | "api" | "ui" }[] = [];
    const planner = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: PLANNER_PROMPT,
        tools: {
            createPlan: {
                inputSchema: z.object({
                    tasks: z.array(z.object({
                        taskTitle: z.string().describe("A high-level step describing what needs to be built. Title of the task. Around 10 words."),
                        instructions: z.string().describe("Detailed step-by-step instructions for the coding agent. Be specific and actionable. Include: (1) Which files to create/modify with exact paths (e.g., 'app/api/users/route.ts', 'components/UserList.tsx'), (2) Key implementation details (schema fields, API endpoints, component props, state management), (3) Dependencies or libraries needed, (4) Integration points with other layers. Use clear, imperative language."),
                        type: z.enum(["db", "api", "ui"]).describe("The layer this task belongs to. Tasks are executed in order, so \"db\" tasks run first, then \"api\", then \"ui\"."),
                    })).min(1).max(6).describe(`
                        Plan the app by breaking it into high-level build steps, ordered bottom-up:
                        1. **Database layer ("db")** — Define the tables/models and their relationships needed to persist the app's data.
                        2. **API layer ("api")** — Define the server endpoints or actions that read/write from the database and contain core business logic.
                        3. **UI layer ("ui")** — Define the pages and key components the user interacts with, wired to the API.
                    `),
                }),
                outputSchema: z.string(),
                execute: async ({ tasks }) => {

                    retPlan = tasks;
                    return tasks;
                }
            }
        }
    })
    await planner.stream({
        preventClose: true,
        sendStart: false,
        sendFinish: false,
        messages,
        writable,
        stopWhen: hasToolCall("createPlan"),
    })
    console.log("retPlan", retPlan);
    return retPlan;
}
export { planner }