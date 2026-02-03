"use client";
import { WebContainer } from '@webcontainer/api';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { Terminal } from 'xterm';
import { useTheme } from 'next-themes';

type SandboxStatus = "not-started" | "starting" | "mounting" | "mounted" | "dev" | "ready" | "stopping" | "stopped";
interface Sandbox {
    iframeRef: RefObject<HTMLIFrameElement | null>
    terminalRef: RefObject<HTMLDivElement | null>
    xtermRef: RefObject<Terminal | null>
}
function useSandbox({ iframeRef, terminalRef, xtermRef }: Sandbox) {
    const [url, setUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<SandboxStatus>("not-started");
    const [container, setContainer] = useState<WebContainer | null>(null);
    const { resolvedTheme } = useTheme();
    const hasBooted = useRef(false);
    const containerRef = useRef<WebContainer | null>(null);
    const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
    const terminalInitialized = useRef(false);

    // Initialize terminal when the ref is ready
    const initTerminal = useCallback(async () => {
        if (terminalInitialized.current || !terminalRef.current) {
            return;
        }
        terminalInitialized.current = true;

        const [{ Terminal }, { FitAddon }] = await Promise.all([
            import('xterm'),
            import('@xterm/addon-fit')
        ]);

        const terminal = new Terminal({
            convertEol: true,
            disableStdin: true,
            cursorBlink: false,
            cursorStyle: 'bar',
            cursorInactiveStyle: 'none',
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.2,
            theme: {
                background: resolvedTheme === "dark" ? '#1a1a1a' : '#fafafa',
                foreground: resolvedTheme === "dark" ? '#e4e4e7' : '#27272a',
                cursor: 'transparent',
                selectionBackground: resolvedTheme === "dark" ? '#3f3f46' : '#d4d4d8',
            }
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalRef.current);

        // Small delay to ensure the container is sized correctly
        requestAnimationFrame(() => {
            fitAddon.fit();
        });

        xtermRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        });
        resizeObserver.observe(terminalRef.current);

        // Cleanup function stored for later
        return () => {
            resizeObserver.disconnect();
            terminal.dispose();
        };
    }, [resolvedTheme, terminalRef, xtermRef]);

    // Update terminal theme when it changes
    useEffect(() => {
        if (xtermRef.current && resolvedTheme) {
            xtermRef.current.options.theme = {
                background: resolvedTheme === "dark" ? '#1a1a1a' : '#fafafa',
                foreground: resolvedTheme === "dark" ? '#e4e4e7' : '#27272a',
                cursor: 'transparent',
                selectionBackground: resolvedTheme === "dark" ? '#3f3f46' : '#d4d4d8',
            };
        }
    }, [resolvedTheme, xtermRef]);

    const start = useCallback(async (type: "vite" | "next") => {
        if (hasBooted.current) {
            return containerRef.current;
        }
        hasBooted.current = true;

        // Initialize terminal if not already done
        await initTerminal();

        try {
            setStatus("starting");
            xtermRef.current?.writeln('\x1b[90m Starting sandbox...\x1b[0m');

            const wc = await WebContainer.boot();
            setStatus("mounting");
            xtermRef.current?.writeln('\x1b[90m Mounting files...\x1b[0m');

            const snapshot = await fetch('/api/container/mount', {
                method: "POST",
                body: JSON.stringify({ type }),
            })

            const snapshotBuffer = await snapshot.arrayBuffer()
            await wc.mount(snapshotBuffer)
            containerRef.current = wc;
            console.log("container mounted", wc);
            setContainer(wc);
            setStatus("ready");
            xtermRef.current?.writeln('\x1b[32m✓ Sandbox ready\x1b[0m\n');
            console.log("sandbox ready");
            return wc;
        } catch (error) {
            console.error(error);
            xtermRef.current?.writeln(`\x1b[31m✗ Error: ${error}\x1b[0m`);
            throw error;
        }
    }, [initTerminal, xtermRef]);

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

    const check = useCallback(async () => {
        if (containerRef.current && status === "ready") {
            return true;
        }
        return false;
    }, [containerRef.current]);
    useEffect(() => {
        if (container) {
            container.on("server-ready", (port, serverUrl) => {
                console.log("server-ready", port, serverUrl);
                if (port >= 3000 && port <= 3999) return;
                if (iframeRef.current) {
                    iframeRef.current.src = serverUrl;
                    setStatus("dev");
                }
                setUrl(serverUrl);
            });
        }
    }, [container, iframeRef]);


    return { status, start, stop, container, url, check, initTerminal, fitAddon: fitAddonRef }
}

export { useSandbox, type SandboxStatus }