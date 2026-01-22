"use client";
import { useChat } from "@ai-sdk/react";
import { workflowTransport as transport } from "@/lib/chat/workflow-transport";
import { useMemo, useState } from "react";

export default function ChatPage() {
  // Check for an active workflow run on mount
  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, sendMessage, status } = useChat({
    resume: Boolean(activeRunId),
    transport,
  });
  return (
    <div></div>
  )
}