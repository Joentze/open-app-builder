import { WorkflowChatTransport } from "@workflow/ai";

const workflowTransport = new WorkflowChatTransport({
    api: "/api/chat/persist",
    // Store the run ID when a new chat starts
    onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
            localStorage.setItem("active-workflow-run-id", workflowRunId);
        }
    },
    // Clear the run ID when the chat completes
    onChatEnd: () => {
        localStorage.removeItem("active-workflow-run-id");
    },
    // Use the stored run ID for reconnection
    prepareReconnectToStreamRequest: (options) => {
        const { api, ...rest } = options;
        const runId = localStorage.getItem("active-workflow-run-id");
        if (!runId) throw new Error("No active workflow run ID found");
        return {
            ...rest,
            api: `/api/chat/${encodeURIComponent(runId)}/stream`,
        };
    },
})


export { workflowTransport }