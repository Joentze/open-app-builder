import { WebContainer } from "@webcontainer/api";
import { LogType } from "../validators/log-hook";
import { RunCommandType } from "../validators/run-command-hook";

type HookTools = "runCommand" | "getLogs";
type ToolCallContext = {
    container: WebContainer;
}

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

async function handleToolHooks({ toolName, toolCallId, input }: { toolName: HookTools, toolCallId: string, input: unknown }, { container }: ToolCallContext) {
    switch (toolName) {
        case "runCommand":
            return handleRunCommand({ toolCallId, input: input as { command: string, args: string[] } }, { container });
        case "getLogs":
            return handleGetLogs({ toolCallId }, { container });
        default:
            break;
    }
}

async function handleRunCommand({ toolCallId, input }: { toolCallId: string, input: { command: string, args: string[] } }, { container }: ToolCallContext): Promise<RunCommandType> {
    const { command, args } = input;
    try {
        // RUN COMMAND IN CONTAINER HERE
        const response = await container.spawn(command, args);
        let responseString: string = "There was no response from the command";
        response.output.pipeTo(new WritableStream({
            async write(data) {
                responseString = data.toString();
                await retryWithBackoff(async () => {
                    const result = await fetch(`/api/chat/hooks/approval/command`, {
                        method: "POST",
                        body: JSON.stringify({
                            toolCallId,
                            command,
                            args,
                            response: responseString,
                        }),
                    });
                    const json = await result.json();
                    return { success: json.success, error: json.error };
                });

            }
        }));
        return {
            command,
            args,
            response: responseString,
        };

    } catch (error) {
        console.error(error);
        return {
            command,
            args,
            response: "Failed to run command",
        };
    }
}
async function handleGetLogs({ toolCallId }: { toolCallId: string }, { container }: ToolCallContext): Promise<LogType> {
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