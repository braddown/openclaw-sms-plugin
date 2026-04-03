import type { ChannelConfigSchema } from "openclaw/plugin-sdk";

export const SmsConfigSchema: ChannelConfigSchema = {
  schema: {
    type: "object",
    properties: {
      enabled: {
        type: "boolean",
        default: true,
      },
      apiKey: {
        type: "string",
        description: "Kudosity API key (kd_live_... for production, kd_test_... for sandbox)",
      },
      baseUrl: {
        type: "string",
        default: "https://platform.kudosity.dev/api/v1",
        description: "Kudosity API base URL",
      },
      agentId: {
        type: "string",
        description: "Kudosity agent profile ID (optional)",
      },
      allowFrom: {
        type: "array",
        items: { type: "string" },
        description: "Allowed phone numbers (E.164 format: +61412345678)",
        default: [],
      },
      dmPolicy: {
        type: "string",
        enum: ["open", "pairing"],
        default: "pairing",
        description: "Direct message policy: 'open' allows all, 'pairing' requires approval",
      },
      webhookPort: {
        type: "number",
        default: 3001,
        description: "Port for receiving Kudosity webhooks",
      },
      webhookPath: {
        type: "string", 
        default: "/channels/sms/webhook",
        description: "Webhook endpoint path",
      },
    },
    required: ["apiKey"],
  },
  uiHints: {
    enabled: {
      label: "Enable SMS Channel",
      help: "Enable SMS messaging via Kudosity platform",
    },
    apiKey: {
      label: "API Key",
      help: "Your Kudosity API key from platform.kudosity.dev",
      sensitive: true,
      placeholder: "kd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    baseUrl: {
      label: "API Base URL", 
      help: "Kudosity API endpoint (use default unless using custom deployment)",
      advanced: true,
    },
    agentId: {
      label: "Agent Profile ID",
      help: "Optional: Kudosity agent profile ID for message attribution",
      advanced: true,
      placeholder: "790f6855-ed75-4b32-8656-602428d2b774",
    },
    allowFrom: {
      label: "Allowed Phone Numbers",
      help: "Phone numbers allowed to send SMS to your agent (E.164 format)",
      itemTemplate: "+61412345678",
    },
    dmPolicy: {
      label: "Message Policy",
      help: "Who can send you SMS messages",
    },
    webhookPort: {
      label: "Webhook Port",
      help: "Port to receive inbound SMS notifications", 
      advanced: true,
    },
    webhookPath: {
      label: "Webhook Path",
      help: "URL path for webhook endpoint",
      advanced: true,
    },
  },
};