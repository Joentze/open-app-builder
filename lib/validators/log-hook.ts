import { z } from "zod";

const logSchema = z.object({
    logs: z.array(z.object({
        level: z.enum(["log", "warn", "error"]),
        message: z.string(),
        timestamp: z.string(),
    })),
});


type LogType = z.infer<typeof logSchema>;

export { logSchema, type LogType };