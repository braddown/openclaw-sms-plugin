import type { ResolvedSmsAccount, SendResult } from "./types.js";
export declare function sendSmsMessage(to: string, content: string, account: ResolvedSmsAccount, options?: {
    sessionId?: string;
    agentContext?: string;
    timeout?: number;
}): Promise<SendResult>;
export declare function chunkSmsText(text: string, maxLength?: number): string[];
