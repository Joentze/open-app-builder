"use client";

import { Loader } from "@/components/ai-elements/loader";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolState =
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-error"
    | "output-denied";

type TaskStatus = "pending" | "in-progress" | "completed" | "error";

interface TaskData {
    task: string;
    type: "db" | "api" | "ui";
}

interface TaskListToolCallProps {
    state: ToolState;
    tasks: TaskData[];
}

export default function TaskListToolCall({
    state,
    tasks,
}: TaskListToolCallProps) {
    return (
        <div className="w-full rounded-lg border bg-card p-3 space-y-1.5">
            {tasks.map((task, index) => {
                const status: TaskStatus = "in-progress";
                return (
                    <div key={index} className="flex items-center gap-2.5 text-sm text-foreground">
                        <span className="shrink-0">
                            {status === "in-progress" ? (
                                <Loader size={14} />
                            ) : status === "completed" ? (
                                <Check className="size-3.5 text-green-500" />
                            ) : (
                                <Circle className="size-3 fill-muted-foreground/40 text-muted-foreground/40" />
                            )}
                        </span>
                        <span>{task.task}</span>
                    </div>
                );
            })}
        </div>
    );
}
