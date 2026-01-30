import { z } from "zod";

const checkSandboxHookSchema = z.object({
    available: z.boolean(),
});

type CheckSandboxHookType = z.infer<typeof checkSandboxHookSchema>;

export { checkSandboxHookSchema, type CheckSandboxHookType };