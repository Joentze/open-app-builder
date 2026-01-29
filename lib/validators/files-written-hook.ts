import { z } from "zod";

const fileWrittenSchema = z.object({
    directory: z.string(),
    content: z.string(),
    success: z.boolean(),
});

const filesWrittenSchema = z.object({
    files: z.array(fileWrittenSchema),
});

type FilesWrittenType = z.infer<typeof filesWrittenSchema>;
type FileWrittenType = z.infer<typeof fileWrittenSchema>;

export { filesWrittenSchema, fileWrittenSchema, type FilesWrittenType, type FileWrittenType };

