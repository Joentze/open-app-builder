import { z } from "zod";

const runCommandSchema = z.object({
    command: z.string(),
    args: z.array(z.string()),
    response: z.string(),
});

type RunCommandType = z.infer<typeof runCommandSchema>;

export { runCommandSchema, type RunCommandType };