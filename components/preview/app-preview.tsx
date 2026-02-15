"use client";

import {
    WebPreview,
    WebPreviewNavigation,
    WebPreviewNavigationButton,
    WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import {
    Code,
    DatabaseIcon,
    GlobeIcon,
    Loader2Icon,
    RefreshCcwIcon,
    XIcon,
} from "lucide-react";
import { RefObject, useState, useEffect } from "react";
import { SandboxStatus } from "@/hooks/use-sandbox";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import DatabaseViewer from "./database/database-viewer";
import CodeViewer from "./code/code-viewer";
import { WebContainer } from "@webcontainer/api";


interface AppPreviewProps {
    status: SandboxStatus
    url: string | null;
    studioUrl: string | null;
    wc: WebContainer | null;
    iframeRef: RefObject<HTMLIFrameElement | null>;
    onClose: () => void;
    onReload: () => void;
}

const AppPreview = ({ status, url, studioUrl, wc, iframeRef, onClose, onReload }: AppPreviewProps) => {
    const [isReady, setIsReady] = useState(true);
    const [view, setView] = useState<"site" | "database" | "code">("site");

    useEffect(() => {
        if (status === "dev" && !isReady) {
            setIsReady(true);
        }
    }, [status, isReady]);

    useEffect(() => {
        if (!iframeRef.current) return;
        if (view === "site" && url) {
            iframeRef.current.src = url;
        }
        if (view === "database" && studioUrl) {
            iframeRef.current.src = studioUrl;
        }
    }, [iframeRef, view, url, studioUrl]);

    return (
        <div className="h-full p-4 shadow-lg rounded-lg">
            <WebPreview
                defaultUrl={url ?? "/"}
                onUrlChange={(url) => console.log("URL changed to:", url)}
                className="h-full overflow-hidden"
            >
                <WebPreviewNavigation>
                    <Tabs value={view} className="h-10 mt-1" onValueChange={(value) => setView(value as "site" | "database" | "code")}>
                        <TabsList className="">
                            <TabsTrigger value="site" className="w-7 h-7"><GlobeIcon className="size-4 " /></TabsTrigger>
                            <TabsTrigger value="database" className="w-7 h-7"><DatabaseIcon className="size-4" /></TabsTrigger>
                            <TabsTrigger value="code" className="w-7 h-7"><Code className="size-4" /></TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <WebPreviewNavigationButton
                        onClick={onReload}
                        tooltip="Reload"
                        className="ml-auto"
                    >
                        <RefreshCcwIcon className="size-4" />
                    </WebPreviewNavigationButton>
                    <WebPreviewUrl />
                    <WebPreviewNavigationButton
                        onClick={onClose}
                        tooltip="Close"
                        className="mr-auto"
                    >
                        <XIcon className="size-4" />
                    </WebPreviewNavigationButton>

                </WebPreviewNavigation>

                {view === "database" ? (
                    <DatabaseViewer isReady={isReady} wc={wc} studioUrl={studioUrl} />
                ) : isReady && view !== "code" ? (
                    <div className="flex-1">
                        <iframe
                            ref={iframeRef}
                            className="size-full w-full"
                            title="WebContainer Preview"
                            allow="cross-origin-isolated"
                        />
                    </div>
                ) : isReady ? (
                    <CodeViewer />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2Icon className="size-4 animate-spin" />
                    </div>
                )}
            </WebPreview>
        </div>
    );
};

export default AppPreview;
