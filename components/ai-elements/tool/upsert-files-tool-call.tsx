"use client";

import {
    Task,
    TaskContent,
    TaskItem,
    TaskItemFile,
    TaskTrigger,
} from "@/components/ai-elements/task";
import { Shimmer } from "../shimmer";
import { FileCode2, FileJson, FileText, FileType, FilePlus2 } from "lucide-react";
import {
    SiReact,
    SiTypescript,
    SiJavascript,
    SiCss,
    SiHtml5,
    SiMarkdown,
} from "@icons-pack/react-simple-icons";
import type { ReactNode } from "react";

type ToolState = 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied';

interface FileData {
    directory: string;
    content: string;
}

interface UpsertFilesToolCallProps {
    toolCallId: string;
    state: ToolState;
    files: FileData[];
}

function getFileIcon(filepath: string): ReactNode {
    const ext = filepath.split('.').pop()?.toLowerCase() || '';
    const filename = filepath.split('/').pop()?.toLowerCase() || '';

    // Check for specific filenames first
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
        return <SiReact className="size-4" color="#61DAFB" />;
    }

    switch (ext) {
        case 'ts':
            return <SiTypescript className="size-4" color="#3178C6" />;
        case 'js':
            return <SiJavascript className="size-4" color="#F7DF1E" />;
        case 'tsx':
        case 'jsx':
            return <SiReact className="size-4" color="#61DAFB" />;
        case 'css':
            return <SiCss className="size-4" color="#1572B6" />;
        case 'html':
            return <SiHtml5 className="size-4" color="#E34F26" />;
        case 'json':
            return <FileJson className="size-4 text-yellow-500" />;
        case 'md':
        case 'mdx':
            return <SiMarkdown className="size-4" color="#083FA1" />;
        case 'txt':
            return <FileText className="size-4 text-muted-foreground" />;
        case 'svg':
            return <FileType className="size-4 text-orange-500" />;
        default:
            return <FileCode2 className="size-4 text-muted-foreground" />;
    }
}

function getFileName(filepath: string): string {
    return filepath.split('/').pop() || filepath;
}

export default function UpsertFilesToolCall({ toolCallId, state, files }: UpsertFilesToolCallProps) {
    const isStreaming = state !== 'output-available' && state !== 'output-error' && state !== 'output-denied';
    const fileCount = files.length;

    const title = isStreaming
        ? `Creating files...`
        : `Created ${fileCount} file${fileCount !== 1 ? 's' : ''}`;

    return (
        <Task className="w-full" defaultOpen={isStreaming}>
            <TaskTrigger title={title} icon={<FilePlus2 className="size-4" />} />
            <TaskContent>
                {isStreaming && files.length === 0 && (
                    <TaskItem>
                        <Shimmer>Generating files...</Shimmer>
                    </TaskItem>
                )}
                {files.map((file, index) => (
                    <TaskItem key={`${toolCallId}-file-${index}`}>
                        <span className="inline-flex items-center gap-1">
                            {isStreaming ? 'Writing' : 'Wrote'}
                            <TaskItemFile>
                                {getFileIcon(file.directory)}
                                <span>{getFileName(file.directory)}</span>
                            </TaskItemFile>
                        </span>
                    </TaskItem>
                ))}
            </TaskContent>
        </Task>
    );
}
