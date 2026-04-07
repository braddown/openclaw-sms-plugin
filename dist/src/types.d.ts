export type SmsConfig = {
    apiKey?: string;
    baseUrl?: string;
    agentId?: string;
    allowFrom?: string[];
    dmPolicy?: "open" | "pairing";
    callbackSecret?: string;
    webhookPath?: string;
};
export type ResolvedSmsAccount = {
    accountId: string;
    name: string;
    enabled: boolean;
    config: SmsConfig & {
        apiKey: string;
        baseUrl: string;
    };
};
export type KudosityApiMessage = {
    to: string;
    content: string;
    channel: "sms";
    agent_id?: string;
    metadata?: {
        openclaw_session?: string;
        agent?: string;
        [key: string]: unknown;
    };
};
export type KudosityApiResponse = {
    id: string;
    status: "sent" | "blocked" | "failed";
    provider_message_id?: string;
    safety?: {
        checks_passed: boolean;
        denied_reason?: string;
    };
    error?: string;
};
export type KudosityConversation = {
    id: string;
    profile_id: string;
    status: string;
    channel: string;
    priority: string;
    subject: string | null;
    created_at: string;
    updated_at: string;
    cdp_profiles: {
        id: string;
        email: string | null;
        mobile: string;
        first_name: string;
        last_name: string;
    };
};
export type KudosityMessage = {
    id: string;
    content: string;
    direction: "inbound" | "outbound";
    channel: string;
    source: string;
    status: string;
    message_type: string;
    sender_id: string;
    ai_processing_info: Record<string, unknown>;
    created_at: string;
};
export type SendResult = {
    ok: boolean;
    messageId?: string;
    error?: Error;
};
