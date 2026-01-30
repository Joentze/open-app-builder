import { RefObject, useEffect } from "react";

interface TerminalPreviewProps {
    terminalRef: RefObject<HTMLDivElement | null>;
    onMount?: () => void;
}

export default function TerminalPreview({ terminalRef, onMount }: TerminalPreviewProps) {
    // Initialize terminal when the component mounts and ref is ready
    useEffect(() => {
        if (terminalRef.current && onMount) {
            // Small delay to ensure the DOM is fully rendered and sized
            const timer = setTimeout(() => {
                onMount();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [terminalRef, onMount]);

    return (
        <div className="h-full w-full p-4 pt-2">
            <div
                className="bg-muted/50 border border-border rounded-md h-full overflow-hidden p-2"
                ref={terminalRef}
            />
        </div>
    );
}