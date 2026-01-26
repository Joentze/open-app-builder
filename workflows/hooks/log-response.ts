import { defineHook } from "workflow";
import { logSchema as schema } from "@/lib/validators/log-hook";

const logResponseHook = defineHook({
    schema,
});

export { logResponseHook };