import { defineHook } from "workflow";
import { startSandboxHookSchema as schema } from "@/lib/validators/start-sandbox-hook";

const startSandboxResponseHook = defineHook({
    schema,
});

export { startSandboxResponseHook };