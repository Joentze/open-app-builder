import z from "zod";
import { checkSandbox, getLogs, runCommand, startSandbox, upsertFiles } from "../../chat/tools/steps";
import { ModelMessage } from "ai";

interface CodingToolsParams {
    commandTrace: string[];
    summaries: unknown[];
}

function createRunCommandTool({ commandTrace }: CodingToolsParams) {
    return {
        inputSchema: z.object({
            command: z.string(),
            args: z.array(z.string()),
            background: z.boolean().optional().describe("Set to true for long-running commands like 'pnpm run dev' that don't exit on their own"),
        }),
        execute: async (args: { command: string; args: string[]; background?: boolean }, toolData: { toolCallId: string }) => {
            const response = await runCommand(args, { toolCallId: toolData.toolCallId });
            commandTrace.push(response);
            return response;
        },
        outputSchema: z.string(),
    };
}

function createUpsertFilesTool({ commandTrace, summaries }: CodingToolsParams) {
    return {
        inputSchema: z.object({
            prompt: z.string().describe("Prompt to describe the changes to be made to each of the files in the list"),
            files: z.array(z.string()).describe("File paths from root to create/update. IMPORTANT: Use getLogs or checkSandbox first to understand the project structure. Examples: ['app/page.tsx', 'components/ui/button.tsx', 'lib/utils.ts', 'package.json']. Write source files (.tsx, .ts, .css), DO NOT write config files (package.json, tsconfig.json)."),
        }),
        outputSchema: z.string(),
        description: `Use this tool to upsert files in the sandbox, use the prompt to describe in detail, 
        what kind of styling/features/components it should have, and what kind of layout it should have, 
        detail the style guidelines as well. If you are inserting/updating a file, explicityly mention
        in the prompt. If user wants to update a file, use runCommand tool to get the current contents of the file.
        and then use the upsertFiles tool to update the file.`,
        execute: async ({ prompt, files }: { prompt: string, files: string[] }, toolData: { toolCallId: string, messages: ModelMessage[] }) => {
            return await upsertFiles({ prompt, files, commandTrace, summaries }, toolData);
        },
    };
}

function createGetLogsTool() {
    return {
        inputSchema: z.object({}),
        outputSchema: z.string(),
        execute: getLogs,
    };
}

function createStartSandboxTool() {
    return {
        inputSchema: z.object({
            type: z.enum(["vite"]),
        }),
        outputSchema: z.string(),
        execute: startSandbox,
    };
}

function createCheckSandboxTool() {
    return {
        inputSchema: z.object({}),
        outputSchema: z.string(),
        execute: checkSandbox,
    };
}

function createDefaultCodingTools(params: CodingToolsParams) {
    return {
        runCommand: createRunCommandTool(params),
        upsertFiles: createUpsertFilesTool(params),
        getLogs: createGetLogsTool(),
        startSandbox: createStartSandboxTool(),
        checkSandbox: createCheckSandboxTool(),
    };
}

export { createRunCommandTool, createUpsertFilesTool, createGetLogsTool, createStartSandboxTool, createCheckSandboxTool, createDefaultCodingTools };