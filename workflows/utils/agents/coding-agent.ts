import { type ModelMessage, type UIMessageChunk } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { createUpsertFilesTool, createRunCommandTool, createGetLogsTool, createStartSandboxTool, createCheckSandboxTool } from "@/workflows/utils/tools/coding-tools";
import { SANDBOX_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";

type CodingAgentType = "db" | "api" | "ui";

interface CodingAgentParams {
    commandTrace: string[];
    type: CodingAgentType;
    messages: ModelMessage[];
    writable: WritableStream<UIMessageChunk>;
}

async function codingAgent({ commandTrace, type, messages, writable }: CodingAgentParams) {
    const agent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system: SANDBOX_AGENT_PROMPT +
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
    });

    return codingAgentMessages;
}


export { type CodingAgentType, type CodingAgentParams, codingAgent };
