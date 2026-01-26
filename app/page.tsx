"use client";
import { useChat } from "@ai-sdk/react";
import { workflowTransport as transport } from "@/lib/chat/workflow-transport";
import { useMemo } from "react";
import ChatInput from "@/components/chat/chat-input";
import ChatMessages from "@/components/chat/chat-messages";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { FileUIPart } from "ai";
import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Dithering } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";
import { handleToolHooks, type HookTools } from "@/lib/handlers/tool-handler";
import { useSandbox } from "@/hooks/use-sandbox";
import { ThemeToggle } from "@/components/ui/theme-toggle";




export default function ChatPage() {

  const { theme } = useTheme();
  const { status: sandboxStatus, start, stop, container } = useSandbox();


  // Check for an active workflow run on mount
  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, sendMessage, status } = useChat({
    resume: Boolean(activeRunId),
    transport,
    onToolCall: async ({ toolCall }) => {
      if (container && sandboxStatus === "ready") {
        await handleToolHooks({ toolName: toolCall.toolName as HookTools, toolCallId: toolCall.toolCallId, input: toolCall.input }, { container });
      }
    },
  });
  function handleSendMessage({ text, files }: { text: string, files: FileUIPart[] }) {
    sendMessage({ text, files });
  }
  return (
    <div className="flex flex-col min-h-screen relative">
      <ThemeToggle />

      {messages.length > 0 && <ChatMessages status={status} messages={messages} className="flex-grow overflow-y-auto max-w-3xl mx-auto" />}
      {messages.length === 0 && (
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
            <ConversationEmptyState title="Start Building Your App" description="Try out the following prompts to get started" className="" />
          </div>
        </div>
      )}
      <div className="w-full max-w-3xl mx-auto pb-4 px-4 bg-background sticky bottom-0">

        <PromptInputProvider >
          <ChatInput status={status} sendMessage={handleSendMessage} />
        </PromptInputProvider>
      </div>
    </div>
  )
}
