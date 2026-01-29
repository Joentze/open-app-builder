"use client";
import { WebContainer } from '@webcontainer/api';
import { RefObject, useEffect, useRef, useState } from 'react';

type SandboxStatus = "not-started" | "starting" | "mounting" | "mounted" | "ready" | "stopping" | "stopped";
interface Sandbox {
    iframeRef: RefObject<HTMLIFrameElement | null>
}
function useSandbox({ iframeRef }: Sandbox) {
    const [url, setUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<SandboxStatus>("not-started");
    const [container, setContainer] = useState<WebContainer | null>(null);
    const hasBooted = useRef(false);

    async function start() {
        if (hasBooted.current) {
            return container;
        }
        hasBooted.current = true;

        try {
            setStatus("starting");
            const wc = await WebContainer.boot();
            setStatus("mounting");
            const snapshot = await fetch('/api/container/mount')
            const snapshotBuffer = await snapshot.arrayBuffer()
            await wc.mount(snapshotBuffer)
            setContainer(wc);
            setStatus("ready");
            console.log("sandbox ready");
            return wc;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async function stop() {
        try {
            if (container) {
                container.teardown();
                setContainer(null);
                setStatus("stopped");
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    useEffect(() => {
        if (container) {
            container.on("server-ready", (port, url) => {
                console.log("server-ready", port, url);
                if (iframeRef.current) {
                    iframeRef.current.src = url;
                }
                setUrl(url);
            });
        }
    }, [container]);

    useEffect(() => {
        start();
        return () => {
            stop();
        };
    }, []);

    return { status, start, stop, container, url }
}

export { useSandbox, type SandboxStatus }