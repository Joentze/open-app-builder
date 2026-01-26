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
    ConversationEmptyState,
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
    CopyIcon,
    MessageSquareIcon,
    RefreshCcwIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "lucide-react";
import type { UIMessage } from "ai";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
    messages: UIMessage[];
    className?: string;
}

const ChatMessages = ({ messages, className }: ChatMessagesProps) => {
    const [liked, setLiked] = useState<Record<string, boolean>>({});
    const [disliked, setDisliked] = useState<Record<string, boolean>>({});

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
                    messages.map((message) => {
                        const { role, id, parts } = message;

                        const textParts = parts.filter((p) => p.type === "text");
                        const fileParts = parts.filter((p) => p.type === "file");
                        const fullText = textParts.map((p) => p.text).join("");

                        return (
                            <Message from={role} key={id} >
                                {fileParts.length > 0 && (
                                    <Attachments className="mb-2" variant="grid">
                                        {fileParts.map((part, index) => (
                                            <Attachment
                                                data={{ ...part as any, id: `${id}-file-${index}` }}
                                                key={`${id}-file-${index}`}
                                            >
                                                <AttachmentPreview />
                                                <AttachmentRemove />
                                            </Attachment>
                                        ))}
                                    </Attachments>
                                )}
                                <MessageContent >
                                    {role === "assistant" ? (
                                        <MessageResponse >{fullText}</MessageResponse>
                                    ) : (
                                        fullText
                                    )}
                                </MessageContent>

                                {role === "assistant" && (
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

