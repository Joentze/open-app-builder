import { defineHook } from "workflow";
import { runCommandSchema as schema } from "@/lib/validators/run-command-hook";

const runCommandResponseHook = defineHook({
    schema,
});

export { runCommandResponseHook };