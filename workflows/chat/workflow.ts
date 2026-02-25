
import { getWritable, fetch } from "workflow";
import { generateText, type ModelMessage, type UIMessageChunk } from "ai";
import { categorise } from "@/workflows/chat/tools/categorisation";
import { planner } from "./tools/planner";
import { codingAgent } from "../utils/agents/coding-agent";
import { DurableAgent } from "@workflow/ai/agent";
import { SANDBOX_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";
import { createCheckSandboxTool, createGetLogsTool, createRunCommandTool, createStartSandboxTool, createUpsertFilesTool } from "../utils/tools/coding-tools";
import { z } from "zod";

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

    // const category = await categorise({ messages, writable })


    // switch (category) {
    //     case "easy":
    //         // if it is a straight forward task, use regular agent, no need for plan
    //         await codingAgent({ commandTrace }).stream({
    //             sendStart: false,
    //             messages,
    //             writable,
    //         });
    //         break;
    //     case "medium":
    //     case "hard":
    //         // form plan
    //         const plan = await planner({ messages, writable, commandTrace });
    //         // writeToStream(writable, {
    //         //     type: "data-plan",
    //         //     data: plan,
    //         // });
    //         const completedResponseMessages: ModelMessage[] = [];
    //         for (const [index, task] of plan.entries()) {

    //             const { taskTitle, type } = task;

    //             const { messages: modelMessages } = await codingAgent({ commandTrace, type }).stream({
    //                 sendStart: false,
    //                 writable,
    //                 collectUIMessages: true,
    //                 messages: [
    //                     ...messages,
    //                     ...completedResponseMessages,
    //                     {
    //                         role: "user" as const,
    //                         content: [
    //                             `Complete this task: ${taskTitle}`,
    //                             getTaskInstructionByType(type),
    //                         ].join("\n\n"),
    //                     },
    //                 ],
    //                 activeTools: index === 0
    //                     ? ["checkSandbox", "startSandbox", "upsertFiles", "runCommand", "getLogs"]
    //                     : ["upsertFiles", "runCommand", "getLogs"],
    //                 sendFinish: index === plan.length - 1,
    //                 preventClose: index === plan.length - 1 ? false : true,
    //             });


    //             // writeToStream(writable, {
    //             //     type: "data-task-complete",
    //             //     data: {
    //             //         index,
    //             //         task: taskTitle,
    //             //     },
    //             // });
    //         }
    //         break;
    // }

    let tasks: { taskNumber: number, taskTitle: string, type: "db" | "api" | "ui", completed: boolean }[] = [];
    let summaries: unknown[] = [];
    let baseTaskMessages: unknown[] | null = null;
    let activeTaskNumber: number | null = null;
    const complexAgent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: [
            SANDBOX_AGENT_PROMPT,
        ].join("\n\n"),
        tools: {
            startSandbox: createStartSandboxTool(),
            checkSandbox: createCheckSandboxTool(),
            upsertFiles: createUpsertFilesTool({ commandTrace, summaries }),
            runCommand: createRunCommandTool({ commandTrace, summaries }),
            getLogs: createGetLogsTool(),
            completeTask: {
                inputSchema: z.object({
                    taskNumber: z.number().describe("The number of the task in the list."),
                }),
                outputSchema: z.string(),
                execute: async ({ taskNumber }, { messages }) => {
                    const completedTask = tasks.find((task) => task.taskNumber === taskNumber);
                    tasks = tasks.map((task) => task.taskNumber === taskNumber ? { ...task, completed: true } : task);
                    const { text: summary } = await generateText({
                        model: "xai/grok-4.1-fast-non-reasoning",
                        system: "Summarize what was accomplished for this task in a concise paragraph. For each modified file, summarize the changes made. Based on the messages, and the task instructions, summarize what was accomplished.",
                        prompt: `Task: ${completedTask?.taskTitle}
                        Messages: ${JSON.stringify(messages, null, 2)}
                        Task Instructions: ${getTaskInstructionByType(completedTask?.type as "db" | "api" | "ui")}`,
                    });
                    summaries.push({
                        role: "assistant" as const,
                        content: [{ type: "text", text: summary }],
                    });
                    return `Task ${taskNumber} summary: ${summary}`;
                }
            },
            createTasks: {
                inputSchema: z.object({
                    tasks: z.array(z.object({
                        taskNumber: z.number().describe("The number of the task in the list."),
                        taskTitle: z.string().describe("A high-level step describing what needs to be built. Title of the task. Around 10 words."),
                        type: z.enum(["db", "api", "ui"]).describe("The layer this task belongs to. Tasks are executed in order, so \"db\" tasks run first, then \"api\", then \"ui\"."),
                    })).min(1).max(6).describe(`
                        Plan the app by breaking it into high-level build steps, ordered bottom-up:
                        1. **Database layer ("db")** — Define the tables/models and their relationships needed to persist the app's data.
                        2. **API layer ("api")** — Define the server endpoints or actions that read/write from the database and contain core business logic.
                        3. **UI layer ("ui")** — Define the pages and key components the user interacts with, wired to the API.
                    `),
                }).describe("when the app requires backend logic, and is beyond trivial, use this tool to create the tasks, so that work is more focused"),
                outputSchema: z.string(),
                execute: async ({ tasks: generatedTasks }) => {
                    console.log("generatedTasks", JSON.stringify(generatedTasks, null, 2));
                    tasks = generatedTasks.map(({ taskNumber, taskTitle, type }: any) => ({ taskNumber, taskTitle, type, completed: false }));
                    tasks = tasks.sort((a, b) => a.taskNumber - b.taskNumber);
                    // Keep the original user-facing context as the stable base once task mode starts.
                    baseTaskMessages = incomingMessages as unknown[];
                    return JSON.stringify(tasks);
                }
            }
        }

    })

    const currentAvailableTools = ["upsertFiles", "runCommand", "getLogs", "checkSandbox", "startSandbox", "createTasks", "completeTask"];

    // can filter out tools based on how much it is used in the messages as well

    await complexAgent.stream({
        messages,
        writable,
        prepareStep: async ({ steps, messages: prepareStepMessages }) => {
            let messages = [...prepareStepMessages];
            const hasStartSandbox = steps.find(({ toolCalls }) => {
                return toolCalls.some(({ toolCallId }) => toolCallId === "startSandbox");
            })
            const hasCheckSandbox = steps.find(({ toolCalls }) => {
                return toolCalls.some(({ toolCallId }) => toolCallId === "checkSandbox");
            })
            const hasCreateTasks = steps.find(({ toolCalls }) => {
                return toolCalls.some(({ toolCallId }) => toolCallId === "createTasks");
            })
            // once has check sendbox and start sandbox, we can remove it from the agent
            const availableTools = currentAvailableTools

            const activeTools = availableTools.filter((tool) => {
                if (hasStartSandbox && tool === "startSandbox") return false;
                if (hasCheckSandbox && tool === "checkSandbox") return false;
                if (hasCreateTasks && tool === "createTasks") return false;
                return true;
            })

            let systemPromptParts = [SANDBOX_AGENT_PROMPT];
            if (tasks.length > 0) {
                // if tasks have been created, edit the system prompt to keep todos
                const todoPrompt = tasks.map(({ taskTitle, type, completed }) => `[${completed ? "x" : " "}] ${taskTitle} (${type})`).join("\n");
                systemPromptParts.push(`
                Here are the tasks that need to be completed, if [x] task is completed, else [ ] task is not completed:
                ${todoPrompt}
                `);
                systemPromptParts.push(`
                When you are done with a task, use the \`completeTask\` tool to mark it as completed.
                `);
            }

            const incompleteTasks = tasks.filter(({ completed }) => !completed);

            if (incompleteTasks.length > 0) {
                const [nextTask] = incompleteTasks;
                const canonicalPrefix = [
                    ...((baseTaskMessages ?? incomingMessages) as unknown as typeof prepareStepMessages),
                    ...(summaries as unknown as typeof prepareStepMessages),
                ];
                const hasSwitchedTask = activeTaskNumber !== nextTask.taskNumber;
                activeTaskNumber = nextTask.taskNumber;

                // Preserve in-progress context for the active task, but squash completed tasks.
                const existingTaskContext = hasSwitchedTask
                    ? []
                    : messages.slice(canonicalPrefix.length);

                const nextTaskPrompt = {
                    role: "user" as const,
                    content: [{
                        type: "text",
                        text: [
                            `Complete the following task: ${nextTask.taskTitle}`,
                            getTaskInstructionByType(nextTask.type),
                        ].join("\n\n")
                    }],
                } as unknown as (typeof prepareStepMessages)[number];

                messages = [
                    ...canonicalPrefix,
                    ...(existingTaskContext.length > 0 ? existingTaskContext : [nextTaskPrompt]),
                ];
            }

            return {
                activeTools,
                system: systemPromptParts.join("\n\n"),
                messages,
            }

        }
    })

}