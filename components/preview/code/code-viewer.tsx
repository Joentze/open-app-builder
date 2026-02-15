"use client";

import { LaptopMinimalIcon } from "lucide-react";

const CodeViewer = () => {
    return (
        <div className="flex-1 p-6 overflow-auto">
            <div className="mx-auto max-w-3xl rounded-lg border bg-muted/30 p-6">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <LaptopMinimalIcon className="size-4" />
                    Code View (Boilerplate)
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                    This panel is a placeholder for an editor/file explorer.
                </p>
                <div className="mt-4 rounded-md border bg-background p-4 font-mono text-xs">
                    <div>src/</div>
                    <div className="pl-4">main.tsx</div>
                    <div className="pl-4">App.tsx</div>
                    <div className="pl-4">components/</div>
                    <div className="pl-8">Button.tsx</div>
                    <div className="pl-4">db/</div>
                    <div className="pl-8">schema.ts</div>
                    <div className="pl-8">client.ts</div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                    Next step: connect this tab to your container filesystem and a code editor component.
                </p>
            </div>
        </div>
    );
};

export default CodeViewer;
