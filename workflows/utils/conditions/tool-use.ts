import type { ModelMessage } from "ai";

/**
 * Checks whether a specific tool has been called in the message history.
 */
function noOfTimesToolHasBeenUsed(toolName: string, messages: ModelMessage[]): number {
    let count = 0;
    for (const message of messages) {
        if (message.role === "assistant" && Array.isArray(message.content)) {
            for (const part of message.content) {
                if (part.type === "tool-call" && part.toolName === toolName) {
                    count++;
                }
            }
        }
    }
    return count;
}



export { noOfTimesToolHasBeenUsed };
