// SMS Channel Plugin Types

export type SmsConfig = {
  apiKey?: string;
  baseUrl?: string;
  agentId?: string;
  allowFrom?: string[];
  dmPolicy?: "open" | "pairing";
  webhookPort?: number;
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

export type KudosityWebhookPayload = {
  event: "message.inbound" | "message.sent" | "message.failed" | "safety.blocked";
  timestamp: string;
  data: {
    id: string;
    conversation_id?: string;
    content?: string;
    from?: string;
    to?: string;
    channel?: string;
    agent_profile_id?: string;
    provider_message_id?: string;
    created_at?: string;
    [key: string]: unknown;
  };
};

export type SendResult = {
  ok: boolean;
  messageId?: string;
  error?: Error;
};