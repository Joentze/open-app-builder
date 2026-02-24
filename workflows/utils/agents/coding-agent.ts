
import { DurableAgent } from "@workflow/ai/agent";
import { createUpsertFilesTool, createRunCommandTool, createGetLogsTool, createStartSandboxTool, createCheckSandboxTool } from "@/workflows/utils/tools/coding-tools";
import { SANDBOX_AGENT_PROMPT, DB_AGENT_PROMPT, API_AGENT_PROMPT, UI_AGENT_PROMPT } from "@/lib/prompts/sandbox-agent-prompt";

type CodingAgentType = "db" | "api" | "ui";

function codingAgent({ commandTrace, type }: { commandTrace: string[], type?: CodingAgentType }): DurableAgent {
    const agentPrompt: Record<CodingAgentType, string> = {
        db: DB_AGENT_PROMPT,
        api: API_AGENT_PROMPT,
        ui: UI_AGENT_PROMPT,
    }
    const agent = new DurableAgent({
        model: "anthropic/claude-haiku-4.5",
        system:
            // type ? agentPrompt[type as CodingAgentType] : 
            SANDBOX_AGENT_PROMPT +
            `*IMPORTANT*: At end, list modified files and changes (10 words per file). Do not include any other text in your response.`,
        tools: {
            startSandbox: createStartSandboxTool(),
            checkSandbox: createCheckSandboxTool(),
            upsertFiles: createUpsertFilesTool({ commandTrace }),
            runCommand: createRunCommandTool({ commandTrace }),
            getLogs: createGetLogsTool(),
        },
    });

    return agent;
}


export { type CodingAgentType, codingAgent };
