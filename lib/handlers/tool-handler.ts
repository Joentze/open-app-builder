import { LogType } from "../validators/log-hook";
import { RunCommandType } from "../validators/run-command-hook";

type HookTools = "runCommand" | "getLogs";

async function retryWithBackoff<T>(
    fn: () => Promise<{ success: boolean; data?: T; error?: string }>,
    maxRetries: number = 5,
    initialDelay: number = 100
): Promise<T | null> {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
        const result = await fn();
        if (result.success) {
            return result.data ?? null;
        }
        if (result.error?.includes("not found") && i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
        } else {
            throw new Error(result.error || "Unknown error");
        }
    }
    throw new Error("Max retries exceeded");
}

async function handleToolHooks({ toolName, toolCallId, input }: { toolName: HookTools, toolCallId: string, input: unknown }) {
    switch (toolName) {
        case "runCommand":
            return handleRunCommand({ toolCallId, input: input as { command: string } });
        case "getLogs":
            return handleGetLogs({ toolCallId });
        default:
            break;
    }
}

async function handleRunCommand({ toolCallId, input }: { toolCallId: string, input: { command: string } }): Promise<RunCommandType> {
    const { command } = input;
    try {
        // RUN COMMAND IN CONTAINER HERE
        const response = "test-run-command-response"

        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/command`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    command,
                    response,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });
        return {
            command,
            response,
        };
    } catch (error) {
        console.error(error);
        return {
            command,
            response: "Failed to run command",
        };
    }
}
async function handleGetLogs({ toolCallId }: { toolCallId: string }): Promise<LogType> {
    try {
        // GET LOGS FROM CONTAINER HERE
        const logs: LogType = {
            logs: [
                {
                    level: "log",
                    message: "Hello this is joen from logs",
                    timestamp: new Date().toISOString(),
                },
            ]
        }
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/logs`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    logs,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });
        return logs;
    }
    catch (error) {
        console.error(error);
        return {
            logs: [],
        };
    }
}
export { handleToolHooks, type HookTools };