"use client";

import { UIMessage } from "ai";
import ChatMessages from "@/components/chat/chat-messages";
import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Dithering } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";
import { type SandboxStatus } from "@/hooks/use-sandbox";

interface ChatProps {
    sandboxStatus: SandboxStatus;
    messages: UIMessage[];
    status: "submitted" | "streaming" | "ready" | "error";
}

export default function Chat({ messages, status, sandboxStatus }: ChatProps) {
    const { theme } = useTheme();

    if (messages.length > 0) {
        return (
            <ChatMessages
                status={status}
                messages={messages}
                className="flex-grow overflow-y-auto max-w-3xl mx-auto"
            />
        );
    }

    return (
        <div className="relative size-full flex-1 min-h-0 flex items-center justify-center">
            <div className="m-auto flex flex-col items-center justify-center">
                <Dithering
                    colorBack={theme === "dark" ? "#0a0a0a" : "#ffffff"}
                    colorFront={theme === "dark" ? "#ffffff" : "#0a0a0a"}
                    shape="sphere"
                    type="4x4"
                    size={2}
                    speed={1}
                    scale={0.6}
                    className="mx-auto w-32 h-32"
                />
                <ConversationEmptyState
                    title="Start Building Your App"
                    description="Try out the following prompts to get started"
                    className=""
                />
            </div>
        </div>
    );
}
