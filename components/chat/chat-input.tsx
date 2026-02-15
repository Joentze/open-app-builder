"use client";

import {
    Attachment,
    AttachmentInfo,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@/components/ai-elements/attachments";

import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputFooter,
    PromptInputHeader,
    type PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { ChatStatus, FileUIPart } from "ai";
import { cn } from "@/lib/utils";
import { ShineBorder } from "../ui/shine-border";
import { useTheme } from "next-themes";


const PromptInputAttachmentsDisplay = ({ className }: { className?: string }) => {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
        return null;
    }

    return (
        <Attachments variant="inline" className={className}>
            {attachments.files.map((attachment) => (
                <Attachment
                    data={attachment}
                    key={attachment.id}
                    onRemove={() => attachments.remove(attachment.id)}
                >
                    <AttachmentPreview />
                    <AttachmentInfo />
                    <AttachmentRemove />
                </Attachment>
            ))}
        </Attachments>
    );
};

interface ChatInputProps {
    className?: string;
    status: ChatStatus;
    sendMessage: (message: { text: string, files: FileUIPart[] }) => void;
}
const ChatInput = ({ status, className, sendMessage }: ChatInputProps) => {
    const attachments = usePromptInputAttachments();
    const { theme } = useTheme();
    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);

        if (!(hasText || hasAttachments)) {
            return;
        }

        sendMessage({ text: message.text, files: message.files });
    };

    return (
        <div className="size-full">

            <PromptInput
                autoFocus
                globalDrop
                multiple
                onSubmit={handleSubmit}
                className={cn("border-none", className)}>
                {attachments.files.length > 0 &&
                    (<PromptInputHeader className="px-2">
                        <PromptInputAttachmentsDisplay />
                    </PromptInputHeader>)}
                <PromptInputBody className="border-none">
                    <PromptInputTextarea placeholder="Build a website for my business..." className="" />
                </PromptInputBody>
                <PromptInputFooter>
                    <PromptInputTools>
                        <PromptInputActionMenu>
                            <PromptInputActionMenuTrigger />
                            <PromptInputActionMenuContent>
                                <PromptInputActionAddAttachments />
                            </PromptInputActionMenuContent>
                        </PromptInputActionMenu>
                    </PromptInputTools>

                    <PromptInputSubmit status={status} />
                </PromptInputFooter>
                <ShineBorder shineColor={theme === "dark" ? "#0a0a0a" : "#fbfbfb"} className="rounded-[7px] z-10" duration={60} />
            </PromptInput>
        </div>
    );
};

export default ChatInput;
