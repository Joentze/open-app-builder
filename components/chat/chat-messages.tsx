"use client";

import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@/components/ai-elements/attachments";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
    MessageResponse,
    MessageToolbar,
} from "@/components/ai-elements/message";
import {
    Box,
    CopyIcon,
    Eye,
    RefreshCcwIcon,
    Terminal,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "lucide-react";
import type { ChatStatus, UIMessage } from "ai";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../ai-elements/reasoning";
import ShimmerTextToolCall from "../ai-elements/tool/shimmer-text-tool-call";
import UpsertFilesToolCall from "../ai-elements/tool/upsert-files-tool-call";

interface ChatMessagesProps {
    messages: UIMessage[];
    className?: string;
    status: ChatStatus;
}

const ChatMessages = ({ messages, className, status }: ChatMessagesProps) => {
    const [liked, setLiked] = useState<Record<string, boolean>>({});
    const [disliked, setDisliked] = useState<Record<string, boolean>>({});
    const activeRunId = useMemo(() => {
        if (typeof window === "undefined") return;
        return localStorage.getItem("active-workflow-run-id") ?? undefined;
    }, []);
    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const handleRetry = () => {
        console.log("Retrying...");
    };

    return (
        <Conversation className={cn("relative size-full flex-1 min-h-0", className)} >
            <ConversationContent>

                {
                    messages.map((message, index) => {
                        const { role, id, parts } = message;
                        const isLastMessage = index === messages.length - 1;

                        const textParts = parts.filter((p) => p.type === "text");
                        const fileParts = parts.filter((p) => p.type === "file");
                        const fullText = textParts.map((p) => p.text).join("");

                        // Show toolbar for assistant messages:
                        // - Always show for non-last messages
                        // - For last message: only show if not streaming and no activeRunId
                        const showToolbar = role === "assistant" && (
                            !isLastMessage || (status !== "streaming" && !Boolean(activeRunId))
                        );

                        return (
                            <Message from={role} key={id} >
                                {fileParts.length > 0 && (
                                    <Attachments className="mb-2" variant="grid">
                                        {fileParts.map((part, index) => (
                                            <Attachment
                                                data={{ ...part, id: `${id}-file-${index}` }}
                                                key={`${id}-file-${index}`}
                                            >
                                                <AttachmentPreview />
                                                <AttachmentRemove />
                                            </Attachment>
                                        ))}
                                    </Attachments>
                                )}
                                <MessageContent >
                                    {message.parts.map((part, i) => {
                                        switch (part.type) {
                                            case "text":
                                                return (
                                                    <MessageResponse key={`${message.id}-${i}`}>
                                                        {part.text}
                                                    </MessageResponse>
                                                );
                                            case "reasoning":
                                                if (
                                                    i === message.parts.length - 1 &&
                                                    message.id === messages.at(-1)?.id
                                                ) {
                                                    return (
                                                        <Reasoning
                                                            key={`${message.id}-${i}`}
                                                            className="w-full"
                                                            isStreaming={
                                                                status === "streaming" &&
                                                                i === message.parts.length - 1 &&
                                                                message.id === messages.at(-1)?.id
                                                            }
                                                        >
                                                            <ReasoningTrigger />
                                                            <ReasoningContent>{part.text}</ReasoningContent>
                                                        </Reasoning>
                                                    );
                                                }
                                                break;
                                            case "tool-runCommand":
                                                return (
                                                    <ShimmerTextToolCall key={`${message.id}-${i}`} status={part.state} icon={<Terminal className="size-4" />} beforeText="Running command..." afterText="Command ran" />
                                                )
                                            case "tool-checkSandbox":
                                                return (
                                                    <ShimmerTextToolCall key={`${message.id}-${i}`} status={part.state} icon={<Eye className="size-4" />} beforeText="Checking sandbox..." afterText="Sandbox checked" />
                                                )
                                            case "tool-startSandbox":
                                                return (
                                                    <ShimmerTextToolCall key={`${message.id}-${i}`} status={part.state} icon={<Box className="size-4" />} beforeText="Starting sandbox..." afterText="Sandbox started" />
                                                )
                                            case "tool-upsertFiles": {
                                                const toolCallId = (part as { toolCallId?: string }).toolCallId || '';
                                                // Find all data-file-upsert parts that belong to this tool call
                                                const fileParts = message.parts.filter((p) =>
                                                    p.type === 'data-file-upsert' &&
                                                    (p as { id?: string }).id?.startsWith(toolCallId)
                                                );
                                                const files = fileParts.map((p) => (p as { data: { directory: string; content: string } }).data);
                                                return (
                                                    <UpsertFilesToolCall
                                                        key={`${message.id}-${i}`}
                                                        toolCallId={toolCallId}
                                                        state={part.state}
                                                        files={files}
                                                    />
                                                );
                                            }
                                            default:
                                                return null;
                                        }
                                    })}
                                </MessageContent>

                                {showToolbar && (
                                    <MessageToolbar>
                                        <MessageActions>
                                            <MessageAction
                                                label="Retry"
                                                onClick={handleRetry}
                                                tooltip="Regenerate response"
                                            >
                                                <RefreshCcwIcon className="size-4" />
                                            </MessageAction>
                                            <MessageAction
                                                label="Like"
                                                onClick={() =>
                                                    setLiked((prev) => ({
                                                        ...prev,
                                                        [id]: !prev[id],
                                                    }))
                                                }
                                                tooltip="Like this response"
                                            >
                                                <ThumbsUpIcon
                                                    className="size-4"
                                                    fill={liked[id] ? "currentColor" : "none"}
                                                />
                                            </MessageAction>
                                            <MessageAction
                                                label="Dislike"
                                                onClick={() =>
                                                    setDisliked((prev) => ({
                                                        ...prev,
                                                        [id]: !prev[id],
                                                    }))
                                                }
                                                tooltip="Dislike this response"
                                            >
                                                <ThumbsDownIcon
                                                    className="size-4"
                                                    fill={disliked[id] ? "currentColor" : "none"}
                                                />
                                            </MessageAction>
                                            <MessageAction
                                                label="Copy"
                                                onClick={() => handleCopy(fullText)}
                                                tooltip="Copy to clipboard"
                                            >
                                                <CopyIcon className="size-4" />
                                            </MessageAction>
                                        </MessageActions>
                                    </MessageToolbar>
                                )}
                            </Message>
                        );
                    })
                }
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
    );
};

export default ChatMessages;

