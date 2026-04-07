import type { IncomingMessage, ServerResponse } from "node:http";
import type { ResolvedSmsAccount } from "./types.js";
export type SmsMonitorRuntime = {
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
 * Create the HTTP request handler for the SMS webhook route.
 * This is registered on the gateway via registerHttpRoute.
 */
export declare function createSmsWebhookHandler(params: {
    account: ResolvedSmsAccount;
    runtime: SmsMonitorRuntime;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
