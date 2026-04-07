export const SmsConfigSchema = {
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
        description: "Kudosity agent profile ID",
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
        description: "Direct message policy: 'open' allows all, 'pairing' requires allowFrom approval",
      },
      callbackSecret: {
        type: "string",
        description: "HMAC-SHA256 secret for verifying Kudosity webhook signatures (optional)",
      },
      webhookPath: {
        type: "string",
        default: "/channels/sms/webhook",
        description: "HTTP route path for receiving Kudosity callbacks",
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
      help: "Your Kudosity agent profile ID",
      advanced: true,
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
    callbackSecret: {
      label: "Callback Secret",
      help: "HMAC secret for webhook signature verification (set this in your Kudosity agent profile too)",
      sensitive: true,
      advanced: true,
    },
    webhookPath: {
      label: "Webhook Path",
      help: "URL path for receiving Kudosity callbacks on the gateway",
      advanced: true,
    },
  },
};