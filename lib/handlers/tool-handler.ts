import { WebContainer } from "@webcontainer/api";
import { LogType } from "../validators/log-hook";
import { RunCommandType } from "../validators/run-command-hook";
import { FileWrittenType } from "../validators/files-written-hook";
import { CheckSandboxHookType } from "../validators/check-sandbox-hook";
import { StartSandboxHookType } from "../validators/start-sandbox-hook";
import { RefObject } from "react";
import { Terminal } from "xterm";
type UpsertFilesType = Array<{ directory: string, content: string }>;

type HookTools = "runCommand" | "getLogs" | "upsertFiles" | "checkSandbox" | "startSandbox";
type ToolCallContext = {
    container: WebContainer | null;
    startSandbox?: (type: "vite" | "next") => Promise<WebContainer | null> | undefined;
    checkSandbox?: () => Promise<boolean> | undefined;
    xtermRef: RefObject<Terminal | null>;
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
    // TODO: handle cancellation of the step throwing of error
    throw new Error("Max retries exceeded");
}

async function handleToolHooks({ toolName, toolCallId, input }: { toolName: HookTools, toolCallId: string, input: unknown }, context: ToolCallContext) {

    switch (toolName) {
        case "runCommand":
            return handleRunCommand({ toolCallId, input: input as { command: string, args: string[] } }, context);
        case "getLogs":
            return handleGetLogs({ toolCallId }, context);
        case "checkSandbox":
            return handleCheckSandbox({ toolCallId }, context);
        case "startSandbox":
            return handleStartSandbox({ toolCallId, input: input as { type: "vite" | "next" } }, context);
        default:
            break;
    }
}

async function handleRunCommand({ toolCallId, input }: { toolCallId: string, input: { command: string, args: string[], background?: boolean } }, { container, xtermRef }: ToolCallContext): Promise<RunCommandType> {
    const { command, args, background = false } = input;
    console.log("command", command);
    console.log("args", args);
    console.log("background", background);

    // Check if container is available
    if (!container) {
        const errorResponse = "Sandbox is not available. Please start the sandbox first.";
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/command`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    command,
                    args,
                    response: errorResponse,
                    background,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });
        return { command, args, response: errorResponse, background };
    }

    try {
        // RUN COMMAND IN CONTAINER HERE
        const response = await container.spawn(command, args);
        const outputChunks: string[] = [];

        // Collect output as it comes
        response.output.pipeTo(new WritableStream({
            write(data) {
                xtermRef.current?.write(data.toString());
                outputChunks.push(data.toString());
            }
        }));

        let responseString: string;

        if (background) {
            // For background processes (like npm run dev), wait briefly to capture initial output
            await new Promise(resolve => setTimeout(resolve, 1000));
            responseString = outputChunks.length > 0
                ? outputChunks.join("") + "\n[Process running in background]"
                : `Command started in background`;
        } else {
            // Wait for the command to complete
            const exitCode = await response.exit;
            responseString = outputChunks.length > 0
                ? outputChunks.join("")
                : `Command completed with exit code ${exitCode}`;
        }

        // Send approval after command completes/starts
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/command`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    command,
                    args,
                    response: responseString,
                    background,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return {
            command,
            args,
            response: responseString,
            background,
        };

    } catch (error) {
        console.error(error);
        return {
            command,
            args,
            response: "Failed to run command",
            background,
        };
    }
}

async function handleGetLogs({ toolCallId }: { toolCallId: string }, { container }: ToolCallContext): Promise<LogType> {
    // Check if container is available
    if (!container) {
        const errorLogs: LogType = {
            logs: [
                {
                    level: "error",
                    message: "Sandbox is not available. Please start the sandbox first.",
                    timestamp: new Date().toISOString(),
                },
            ]
        };
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/logs`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    logs: errorLogs,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });
        return errorLogs;
    }

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

async function handleCheckSandbox({ toolCallId }: { toolCallId: string }, { checkSandbox }: ToolCallContext): Promise<CheckSandboxHookType> {
    let available = false;
    try {
        // Check if the container is available and mounted
        available = await checkSandbox?.() ?? false;
        console.log("checking sandbox", available);
    } catch (error) {
        console.error(error);
        available = false;
    }

    try {
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/sandbox/check`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    available,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return { available };
    } catch (error) {
        console.error(error);
        return { available: false };
    }
}

async function handleStartSandbox({ toolCallId, input }: { toolCallId: string, input: { type: "vite" | "next" } }, { container = null, startSandbox }: ToolCallContext): Promise<StartSandboxHookType> {
    console.log("starting sandbox", input.type);
    try {
        // Check if container already exists and is ready
        if (container) {
            await retryWithBackoff(async () => {
                const result = await fetch(`/api/chat/hooks/approval/sandbox/start`, {
                    method: "POST",
                    body: JSON.stringify({
                        toolCallId,
                        success: true,
                    }),
                });
                const json = await result.json();
                return { success: json.success, error: json.error };
            });
            return { success: true };
        }

        try {
            await startSandbox?.(input.type);
            // Sandbox started successfully
            await retryWithBackoff(async () => {
                const result = await fetch(`/api/chat/hooks/approval/sandbox/start`, {
                    method: "POST",
                    body: JSON.stringify({
                        toolCallId,
                        success: true,
                    }),
                });
                const json = await result.json();
                return { success: json.success, error: json.error };
            });
            return { success: true };
        } catch (error) {
            console.error(error);
            const errorMessage = (error as Error).message || "Failed to start sandbox";
            await retryWithBackoff(async () => {
                const result = await fetch(`/api/chat/hooks/approval/sandbox/start`, {
                    method: "POST",
                    body: JSON.stringify({
                        toolCallId,
                        success: false,
                        error: errorMessage,
                    }),
                });
                const json = await result.json();
                return { success: json.success, error: json.error };
            });
            return { success: false, error: errorMessage };
        }
    } catch (error) {
        console.error(error);
        const errorMessage = (error as Error).message || "Unknown error";

        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/sandbox/start`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    success: false,
                    error: errorMessage,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return { success: false, error: errorMessage };
    }
}

// this will be used in onDataPart, this is because we need to wait for the llm to 
// generate the files on the backend first, before we can do anything with the container

async function handleUpsertFiles({ toolCallId, input }: { toolCallId: string, input: UpsertFilesType }, { container }: ToolCallContext): Promise<{ files: FileWrittenType[] }> {
    console.log("files", input);

    // Check if container is available
    if (!container) {
        const errorFiles = input.map(file => ({
            directory: file.directory,
            content: file.content,
            success: false,
        }));

        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/files`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    files: errorFiles,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return { files: errorFiles };
    }

    const confirmedFiles: FileWrittenType[] = [];
    try {
        // Write each file to the WebContainer
        for (const file of input) {
            try {
                // Ensure the directory exists
                const dirPath = file.directory.split('/').slice(0, -1).join('/');
                if (dirPath) {
                    await container.fs.mkdir(dirPath, { recursive: true });
                }
                console.log("writing file", file.directory);
                // Write the file
                await container.fs.writeFile(file.directory, file.content);
                confirmedFiles.push({
                    directory: file.directory,
                    content: file.content,
                    success: true,
                });
                console.log(`Written file: ${file.directory}`);
            } catch (fileError) {
                console.error(`Failed to write file ${file.directory}:`, fileError);
                confirmedFiles.push({
                    directory: file.directory,
                    content: file.content,
                    success: false,
                });
            }
        }

        // Resume the hook with the confirmed files
        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/files`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    files: confirmedFiles,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return { files: confirmedFiles };
    } catch (error) {
        console.error("Error in handleUpsertFiles:", error);
        // Even on error, try to resume the hook with partial results
        const errorFiles = input.map(file => ({
            directory: file.directory,
            content: file.content,
            success: false,
        }));

        await retryWithBackoff(async () => {
            const result = await fetch(`/api/chat/hooks/approval/files`, {
                method: "POST",
                body: JSON.stringify({
                    toolCallId,
                    files: errorFiles,
                }),
            });
            const json = await result.json();
            return { success: json.success, error: json.error };
        });

        return { files: errorFiles };
    }
}

export { handleToolHooks, handleUpsertFiles, type HookTools, type UpsertFilesType };
