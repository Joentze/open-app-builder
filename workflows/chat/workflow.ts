import z from "zod";
import { getWritable, fetch } from "workflow";
import { DurableAgent } from "@workflow/ai/agent";
import { noOfTimesToolHasBeenUsed } from "@/workflows/utils/conditions/tool-use";
import { CodingAgentType, codingAgent } from "@/workflows/utils/agents/coding-agent";
import { convertToModelMessages, generateText, hasToolCall, readUIMessageStream, UIMessage, type ModelMessage, type UIMessageChunk } from "ai";
import { SANDBOX_UPSERT_FILES_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";
import { createCheckSandboxTool, createGetLogsTool, createRunCommandTool, createStartSandboxTool, createUpsertFilesTool } from "../utils/tools/coding-tools";


export async function chatWorkflow(incomingMessages: ModelMessage[]) {
    "use workflow";
    const writable = getWritable<UIMessageChunk>();
    globalThis.fetch = fetch;
    // orchestrator agent, can come up with questionaire for user, this will be human approved on the frontend
    // once the tool is sent in, the orchestrator agent will come up with a to-do list
    // the to-do list will be sent to the coding agent, and the coding agent will execute the tasks

    let commandTrace: string[] = [];
    let messages: ModelMessage[] = incomingMessages;

    // const orchestrator = new DurableAgent({
    //     model: "anthropic/claude-haiku-4.5",
    //     system: "You are a helpful assistant, use startCoding tool to create a to-do list for the coding agent to execute.",
    //     tools: {
    //         // only run this once in the message history
    //         // createPRD: {
    //         //     inputSchema: z.object({
    //         //         questions: z.array(z.object({
    //         //             question: z.string(),
    //         //             options: z.array(z.string()).length(3),
    //         //         })).min(2).max(4),
    //         //     }),
    //         //     outputSchema: z.string()
    //         // },
    //         // creates a to-do list that runs sequentially
    //         startCoding: {
    //             inputSchema: z.object({
    //                 tasks: z.array(z.object({
    //                     task: z.string().describe(`
    //                         A high-level step describing what needs to be built.
    //                         Keep it concise but specific enough for a coding agent to act on.
    //                         Focus on the *what*, not the *how* — the coding agent will figure out implementation details.
    //                         `),
    //                     type: z.enum(["db", "api", "ui"]).describe(`
    //                         The layer this task belongs to. Tasks are executed in order, so
    //                         "db" tasks run first, then "api", then "ui".
    //                         `),
    //                 })).min(1).max(6),
    //             }).describe(`
    //                 Plan the app by breaking it into high-level build steps, ordered bottom-up:

    //                 1. **Database layer ("db")** — Define the tables/models and their relationships needed to persist the app's data.
    //                 2. **API layer ("api")** — Define the server endpoints or actions that read/write from the database and contain core business logic.
    //                 3. **UI layer ("ui")** — Define the pages and key components the user interacts with, wired to the API.

    //                 Not every project requires all three layers. Only include the layers that are actually needed:
    //                 - A static landing page may only need "ui" tasks.
    //                 - A frontend-only app (e.g. a calculator) may only need "ui" tasks with no db or api.
    //                 - A full-stack app with persistence will typically need all three layers.
    //                 Use your judgement based on what the user described. If the user's request is too vague or ambiguous
    //                 to determine which layers are needed, do NOT call this tool — instead, ask the user for clarification.

    //                 Rules:
    //                 - Each task should map to exactly one layer (db, api, or ui).
    //                 - Order tasks so that each layer builds on the one before it (db → api → ui).
    //                 - Keep tasks coarse-grained — one task per major feature area per layer is ideal.
    //                 - Do NOT include setup/boilerplate tasks (project init, install deps, etc.) — those are handled automatically.
    //                 `),
    //             execute: async function ({ tasks }, { abortSignal }) {
    //                 for (const [index, currentTask] of tasks.entries()) {
    //                     console.log("currentTask", currentTask);
    //                     // writable.getWriter().write({
    //                     //     id: index,
    //                     //     type: "data-task-start",
    //                     //     data: {
    //                     //         task: currentTask.task,
    //                     //         type: currentTask.type,
    //                     //     },
    //                     // });
    //                     try {
    //                         const { task, type } = currentTask;
    //                         const codingAgentResult = await codingAgent({
    //                             index,
    //                             commandTrace,
    //                             type: type as CodingAgentType,
    //                             writable,
    //                             abortSignal,
    //                             messages: [
    //                                 ...messages,
    //                                 {
    //                                     role: "user" as const,
    //                                     content: `Complete this task: ${task}`,
    //                                 },
    //                             ]
    //                         })

    //                         return "task complete";

    //                     } catch (error) {
    //                         console.error(error)
    //                         // writable.getWriter().write({
    //                         //     id: index,
    //                         //     type: "data-task-error",
    //                         //     data: {
    //                         //         error: error instanceof Error ? error.message : String(error),
    //                         //     },
    //                         // });
    //                     } finally {
    //                         // writable.getWriter().write({
    //                         //     id: index,
    //                         //     type: "data-task-complete",
    //                         //     data: {
    //                         //         task: currentTask.task,
    //                         //     },
    //                         // });
    //                     }
    //                 }

    //             },
    //             toModelOutput: async ({ output: messages }: { output: ModelMessage[] }) => {
    //                 const lastMessage = messages.slice(-1)[0];
    //                 const content = lastMessage.content;
    //                 const text = typeof content === "string"
    //                     ? content
    //                     : Array.isArray(content)
    //                         ? content.filter((p): p is { type: "text"; text: string } => p.type === "text").map(p => p.text).join("\n")
    //                         : String(content);
    //                 return {
    //                     type: "text" as const,
    //                     value: text,
    //                 }
    //             }
    //         }
    //     }
    // })

    const codingAgent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: SANDBOX_UPSERT_FILES_AGENT_PROMPT,
        tools: {
            upsertFiles: createUpsertFilesTool({ commandTrace }),
            runCommand: createRunCommandTool({ commandTrace }),
            getLogs: createGetLogsTool(),
            startSandbox: createStartSandboxTool(),
            checkSandbox: createCheckSandboxTool(),
        },
    });

    await codingAgent.stream({
        messages,
        writable,
    });
}