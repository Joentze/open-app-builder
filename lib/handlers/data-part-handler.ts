import { WebContainer } from "@webcontainer/api";
import { handleUpsertFiles, type UpsertFilesType } from "./tool-handler";
import { RefObject } from "react";
import { Terminal } from "xterm";

async function handleDataPart({ data, id, type }: { data: unknown, id: string, type: string }, { container, xtermRef }: { container: WebContainer, xtermRef: RefObject<Terminal | null> }) {
    switch (type) {
        case "data-upsert-all-files":
            return await handleUpsertFiles({ toolCallId: id, input: data as UpsertFilesType }, { container, xtermRef });
        default:
            return;
    }
}
export { handleDataPart };