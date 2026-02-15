import { type ModelMessage, type UIMessageChunk } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { createUpsertFilesTool, createRunCommandTool, createGetLogsTool, createStartSandboxTool, createCheckSandboxTool } from "@/workflows/utils/tools/coding-tools";
import { SANDBOX_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";

type CodingAgentType = "db" | "api" | "ui";

interface CodingAgentParams {
    index: number;
    commandTrace: string[];
    type: CodingAgentType;
    messages: ModelMessage[];
    writable: WritableStream<UIMessageChunk>;
    abortSignal: AbortSignal | undefined;
}

async function codingAgent({ index, commandTrace, type, messages, writable, abortSignal }: CodingAgentParams) {

    const agent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: SANDBOX_AGENT_PROMPT +
            // add in file changes summary prompt
            "Summarise the changes you made at the end, list the files you updated and the changes you made to each file.",
        tools: {
            startSandbox: createStartSandboxTool(),
            checkSandbox: createCheckSandboxTool(),
            upsertFiles: createUpsertFilesTool({ commandTrace }),
            runCommand: createRunCommandTool({ commandTrace }),
            getLogs: createGetLogsTool(),
        },
    });
    const { messages: codingAgentMessages } = await agent.stream({
        messages,
        writable,
        sendStart: false,
        sendFinish: false,
        preventClose: true,
        abortSignal
    });

    return codingAgentMessages.slice(-1)[0];

}


export { type CodingAgentType, type CodingAgentParams, codingAgent };
