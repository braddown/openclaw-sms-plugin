import type { ResolvedSmsAccount } from "./types.js";
export type RealtimeMonitorRuntime = {
    handleInboundMessage?: (message: {
        channel: string;
        from: string;
        content: string;
        messageId: string;
        conversationId?: string;
        timestamp: string;
        metadata?: Record<string, unknown>;
    }) => void;
    log?: {
        info?: (message: string) => void;
        error?: (message: string) => void;
        warn?: (message: string) => void;
        debug?: (message: string) => void;
    };
};
/**
 * Start polling for new inbound messages.
 * Returns a cleanup function to stop polling.
 */
export declare function startRealtimeMonitor(params: {
    account: ResolvedSmsAccount;
    runtime: RealtimeMonitorRuntime;
    agentProfileId: string;
}): Promise<() => void>;
