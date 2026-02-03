import { Shimmer } from "../shimmer";

interface ShimmerTextToolCallProps {
    icon: React.ReactNode;
    beforeText: string;
    afterText: string;
    status: 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied';
}

export default function ShimmerTextToolCall({ icon, beforeText, afterText, status }: ShimmerTextToolCallProps) {
    return (
        <div className="flex flex-row items-center gap-2 text-muted-foreground" >
            {icon}
            {status === 'output-available' ? <p>{afterText}</p> : <Shimmer>{beforeText}</Shimmer>}
        </div>
    )
}