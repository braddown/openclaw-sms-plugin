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
 * Start a Supabase Realtime Broadcast subscription for inbound messages.
 *
 * The plugin subscribes to the `agent:{agentProfileId}:inbound` channel.
 * The Kudosity platform broadcasts to this channel when an inbound SMS
 * is routed to the agent. No RLS or authentication needed for broadcasts.
 *
 * Returns a cleanup function to stop the subscription.
 */
export declare function startRealtimeMonitor(params: {
    account: ResolvedSmsAccount;
    runtime: RealtimeMonitorRuntime;
    agentProfileId: string;
}): Promise<() => void>;
