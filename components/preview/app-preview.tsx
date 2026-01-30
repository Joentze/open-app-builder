"use client";

import {
    WebPreview,
    WebPreviewBody,
    WebPreviewConsole,
    WebPreviewNavigation,
    WebPreviewNavigationButton,
    WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import {
    Loader2Icon,
    Maximize2Icon,
    RefreshCcwIcon,
    XIcon,
} from "lucide-react";
import { RefObject, useState, useEffect } from "react";
import { SandboxStatus } from "@/hooks/use-sandbox";


interface AppPreviewProps {
    status: SandboxStatus
    url: string | null;
    iframeRef: RefObject<HTMLIFrameElement | null>;
    onClose: () => void;
    onFullscreen: () => void;
    onReload: () => void;
    logs?: {
        level: "log" | "warn" | "error";
        message: string;
        timestamp: Date;
    }[] | undefined;
}

const AppPreview = ({ status, url, iframeRef, onClose, onFullscreen, onReload, logs }: AppPreviewProps) => {
    const [isReady, setIsReady] = useState(true);

    useEffect(() => {
        if (status === "dev" && !isReady) {
            setIsReady(true);
        }
    }, [status, isReady]);

    return (
        <div className="h-full p-4">
            <WebPreview
                defaultUrl={url ?? "/"}
                onUrlChange={(url) => console.log("URL changed to:", url)}
                className="h-full overflow-hidden"
            >
                <WebPreviewNavigation>
                    <WebPreviewNavigationButton
                        onClick={onReload}
                        tooltip="Reload"
                    >
                        <RefreshCcwIcon className="size-4" />
                    </WebPreviewNavigationButton>

                    <WebPreviewNavigationButton
                        onClick={onFullscreen}
                        tooltip="Maximize"
                    >
                        <Maximize2Icon className="size-4" />
                    </WebPreviewNavigationButton>
                    <WebPreviewUrl />
                    <WebPreviewNavigationButton
                        onClick={onClose}
                        tooltip="Close"
                    >
                        <XIcon className="size-4" />
                    </WebPreviewNavigationButton>

                </WebPreviewNavigation>

                {isReady ? (
                    <div className="flex-1">
                        <iframe
                            ref={iframeRef}
                            className="size-full"
                            title="WebContainer Preview"
                            allow="cross-origin-isolated"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2Icon className="size-4 animate-spin" />
                    </div>
                )}

                {/* <WebPreviewConsole logs={logs} /> */}
            </WebPreview>
        </div>
    );
};

export default AppPreview;
