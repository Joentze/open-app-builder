import { WebContainer } from "@webcontainer/api";
import { handleUpsertFiles, type UpsertFilesType } from "./tool-handler";

async function handleDataPart({ data, id, type }: { data: unknown, id: string, type: string }, { container }: { container: WebContainer }) {
    switch (type) {
        case "data-upsert-all-files":
            return await handleUpsertFiles({ toolCallId: id, input: data as UpsertFilesType }, { container });
        default:
            return;
    }
}
export { handleDataPart };