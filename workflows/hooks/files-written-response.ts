import { defineHook } from "workflow";
import { filesWrittenSchema as schema } from "@/lib/validators/files-written-hook";

const filesWrittenResponseHook = defineHook({
    schema,
});

export { filesWrittenResponseHook };

