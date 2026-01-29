"use client";
import { WebContainer } from '@webcontainer/api';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

type SandboxStatus = "not-started" | "starting" | "mounting" | "mounted" | "ready" | "stopping" | "stopped";
interface Sandbox {
    iframeRef: RefObject<HTMLIFrameElement | null>
}
function useSandbox({ iframeRef }: Sandbox) {
    const [url, setUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<SandboxStatus>("not-started");
    const [container, setContainer] = useState<WebContainer | null>(null);
    const hasBooted = useRef(false);
    const containerRef = useRef<WebContainer | null>(null);

    const start = useCallback(async () => {
        if (hasBooted.current) {
            return containerRef.current;
        }
        hasBooted.current = true;

        try {
            setStatus("starting");
            const wc = await WebContainer.boot();
            setStatus("mounting");
            const snapshot = await fetch('/api/container/mount')
            const snapshotBuffer = await snapshot.arrayBuffer()
            await wc.mount(snapshotBuffer)
            containerRef.current = wc;
            setContainer(wc);
            setStatus("ready");
            console.log("sandbox ready");
            return wc;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }, []);

    const stop = useCallback(() => {
        try {
            if (containerRef.current) {
                containerRef.current.teardown();
                containerRef.current = null;
                setContainer(null);
                setStatus("stopped");
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }, []);

    useEffect(() => {
        if (container) {
            container.on("server-ready", (port, serverUrl) => {
                console.log("server-ready", port, serverUrl);
                if (iframeRef.current) {
                    iframeRef.current.src = serverUrl;
                }
                setUrl(serverUrl);
            });
        }
    }, [container, iframeRef]);

    useEffect(() => {
        // Use an IIFE to handle async initialization
        let mounted = true;

        (async () => {
            const wc = await start();
            if (!mounted || !wc) return;
        })();

        return () => {
            mounted = false;
            stop();
        };
    }, [start, stop]);

    return { status, start, stop, container, url }
}

export { useSandbox, type SandboxStatus }