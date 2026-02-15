"use client";
import { useChat } from "@ai-sdk/react";
import { workflowTransport as transport } from "@/lib/chat/workflow-transport";
import { useMemo, useRef } from "react";
import ChatInput from "@/components/chat/chat-input";
import Chat from "@/components/chat/chat";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { FileUIPart } from "ai";
import { handleToolHooks, type HookTools } from "@/lib/handlers/tool-handler";
import { useSandbox } from "@/hooks/use-sandbox";
import { handleDataPart } from "@/lib/handlers/data-part-handler";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import AppPreview from "@/components/preview/app-preview";
import TerminalPreview from "@/components/preview/terminal-preview";

import { Terminal } from "xterm";


export default function ChatPage() {

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null)
  const { status: sandboxStatus, start, check, container, url, studioUrl, initTerminal } = useSandbox({ iframeRef, terminalRef, xtermRef });


  // Check for an active workflow run on mount
  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, sendMessage, status } = useChat({
    resume: Boolean(activeRunId),
    transport,
    onData: async ({ type, id, data }) => {
      if (container && (sandboxStatus === "ready" || sandboxStatus === "dev")) {
        await handleDataPart({ type, id: id as string, data }, { container, xtermRef });
      }
    },
    onToolCall: async ({ toolCall }) => {

      await handleToolHooks(
        { toolName: toolCall.toolName as HookTools, toolCallId: toolCall.toolCallId, input: toolCall.input },
        { container, startSandbox: start, checkSandbox: check, xtermRef });

    },
  });
  function handleSendMessage({ text, files }: { text: string, files: FileUIPart[] }) {
    sendMessage({ text, files });
  }
  return (
    <div className="flex flex-col min-h-screen relative">


      {/* Hidden iframe for WebContainer - required for the preview to work */}
      {/* <iframe
        className="w-96 h-96"
        ref={iframeRef}
        title="WebContainer Preview"
        allow="cross-origin-isolated"
      /> */}

      <ResizablePanelGroup className="w-full max-h-screen min-h-screen">
        <ResizablePanel defaultSize={40}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Chat messages={messages} status={status} sandboxStatus={sandboxStatus} />
            </div>
            <div className="w-full max-w-3xl mx-auto py-4 pr-0 pl-4 bg-background">
              <PromptInputProvider>
                <ChatInput status={status} sendMessage={handleSendMessage} />
              </PromptInputProvider>
            </div>
          </div>
        </ResizablePanel>
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize={75}>
              <AppPreview url={url} studioUrl={studioUrl} wc={container} status={sandboxStatus} iframeRef={iframeRef} onClose={() => { }} onReload={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = iframeRef.current.src;
                }
              }} />
            </ResizablePanel>
            <ResizablePanel defaultSize={25}>
              <TerminalPreview terminalRef={terminalRef} onMount={initTerminal} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
