import { defineHook } from "workflow";
import { checkSandboxHookSchema as schema } from "@/lib/validators/check-sandbox-hook";

const checkSandboxResponseHook = defineHook({
    schema,
});

export { checkSandboxResponseHook };