import { z } from "zod";

const startSandboxHookSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
});

type StartSandboxHookType = z.infer<typeof startSandboxHookSchema>;

export { startSandboxHookSchema, type StartSandboxHookType };