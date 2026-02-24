
import { getWritable, fetch } from "workflow";
import { type ModelMessage, type UIMessageChunk } from "ai";
import { categorise } from "@/workflows/chat/tools/categorisation";
import { planner } from "./tools/planner";
import { codingAgent } from "../utils/agents/coding-agent";

function writeToStream<T extends UIMessageChunk>(
    writable: WritableStream<UIMessageChunk>,
    chunk: T
) {
    const writer = writable.getWriter();
    writer.write(chunk);
    writer.releaseLock();
}

function getTaskInstructionByType(type: "db" | "api" | "ui"): string {
    if (type === "db") {
        return `
Create database schema in \`src/db/tables\` using Drizzle ORM.
- Define/update tables in \`src/db/tables/*.ts\`
- Export tables in \`src/db/schema.ts\`
- Run \`pnpm db:push\` after schema changes
`;
    }

    if (type === "api") {
        return `
Write API routes in \`./api\` (e.g. \`./api/users.ts\`) using Hono.
- Import \`db\` from \`../src/index\` and tables from \`../src/db/schema\`
- Add/update route handlers in the route file
- Register routes in \`./server.ts\` and preserve existing routes
`;
    }

    return `
Build UI components/pages for this feature.
- Use existing project structure and component patterns
- Keep styles consistent with existing UI
`;
}

export async function chatWorkflow(incomingMessages: ModelMessage[]) {
    "use workflow";
    const writable = getWritable<UIMessageChunk>();
    globalThis.fetch = fetch;
    // orchestrator agent, can come up with questionaire for user, this will be human approved on the frontend
    // once the tool is sent in, the orchestrator agent will come up with a to-do list
    // the to-do list will be sent to the coding agent, and the coding agent will execute the tasks

    let commandTrace: string[] = [];
    let messages: ModelMessage[] = incomingMessages;

    const category = await categorise({ messages, writable })

    // console.log(88, category)


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

    switch (category) {
        case "easy":
            // if it is a straight forward task, use regular agent, no need for plan
            await codingAgent({ commandTrace }).stream({
                sendStart: false,
                messages,
                writable,
            });
            break;
        case "medium":
        case "hard":
            // form plan
            const plan = await planner({ messages, writable, commandTrace });
            // writeToStream(writable, {
            //     type: "data-plan",
            //     data: plan,
            // });
            const completedResponseMessages: ModelMessage[] = [];
            for (const [index, task] of plan.entries()) {

                const { taskTitle, type } = task;

                const { uiMessages } = await codingAgent({ commandTrace, type }).stream({
                    sendStart: false,
                    writable,
                    collectUIMessages: true,
                    messages: [
                        ...messages,
                        ...completedResponseMessages,
                        {
                            role: "user" as const,
                            content: [
                                `Complete this task: ${taskTitle}`,
                                getTaskInstructionByType(type),
                            ].join("\n\n"),
                        },
                    ],
                    activeTools: index === 0
                        ? ["checkSandbox", "startSandbox", "upsertFiles", "runCommand", "getLogs"]
                        : ["upsertFiles", "runCommand", "getLogs"],
                    sendFinish: index === plan.length - 1,
                });
                const taskSummary = uiMessages?.slice(-1)[0].parts.findLastIndex((part) => part.type === "text");
                const taskMessage: ModelMessage = {
                    role: "assistant" as const,
                    content: [
                        "Completed task: " + taskTitle,
                        "Summary of changes: " + taskSummary,
                    ].join("\n\n"),
                }
                completedResponseMessages.push(taskMessage);
                // writeToStream(writable, {
                //     type: "data-task-complete",
                //     data: {
                //         index,
                //         task: taskTitle,
                //     },
                // });
            }
            break;
    }

}