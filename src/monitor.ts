// SMS Monitor — Receives inbound messages via Kudosity agent callback
// Registers an HTTP route on the OpenClaw gateway (no separate server needed).
// The agent's callback_url is set to point to this route.

import { createHmac } from "node:crypto";
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

// Kudosity agent callback payload (from llms.txt "Receiving Messages" section)
type KudosityCallbackPayload = {
  event: "message.inbound";
  message_id: string;
  chat_id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  agent_profile_id: string;
};

/**
 * Verify HMAC-SHA256 signature from Kudosity callback.
 * Returns true if no secret is configured (signature is optional).
 */
function verifySignature(body: string, signature: string | undefined, secret: string | undefined): boolean {
  if (!secret) return true; // No secret configured, skip verification
  if (!signature) return false; // Secret configured but no signature provided
  
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected || signature === `sha256=${expected}`;
}

/**
 * Create the HTTP request handler for the SMS webhook route.
 * This is registered on the gateway via registerHttpRoute.
 */
export function createSmsWebhookHandler(params: {
  account: ResolvedSmsAccount;
  runtime: SmsMonitorRuntime;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { account, runtime } = params;
  const { allowFrom, dmPolicy } = account.config;
  const callbackSecret = account.config.callbackSecret;

  return async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }

    // Read body
    let rawBody = "";
    try {
      rawBody = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
        // 10s timeout
        setTimeout(() => reject(new Error("Body read timeout")), 10_000);
      });
    } catch (err) {
      runtime.log?.error?.(`[sms] Failed to read webhook body: ${err}`);
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    // Verify HMAC signature
    const signature = req.headers["x-kudosity-signature"] as string | undefined;
    if (!verifySignature(rawBody, signature, callbackSecret)) {
      runtime.log?.warn?.("[sms] Webhook signature verification failed");
      res.writeHead(401);
      res.end("Unauthorized");
      return;
    }

    // Parse payload
    let payload: KudosityCallbackPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      runtime.log?.error?.("[sms] Failed to parse webhook JSON");
      res.writeHead(400);
      res.end("Invalid JSON");
      return;
    }

    // Respond immediately (don't block Kudosity's callback)
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));

    // Process the inbound message
    if (payload.event !== "message.inbound") {
      runtime.log?.debug?.(`[sms] Ignoring non-inbound event: ${payload.event}`);
      return;
    }

    if (!payload.from || !payload.content) {
      runtime.log?.warn?.("[sms] Inbound message missing from or content");
      return;
    }

    // Check allowFrom if dmPolicy is pairing
    if (dmPolicy === "pairing" && allowFrom && allowFrom.length > 0) {
      const normalised = payload.from.replace(/[^0-9]/g, "");
      const isAllowed = allowFrom.some(a => normalised.includes(a.replace(/[^0-9]/g, "")));
      if (!isAllowed) {
        runtime.log?.warn?.(`[sms] Rejected message from ${payload.from} (not in allowFrom)`);
        return;
      }
    }

    runtime.log?.info?.(`[sms] Inbound from ${payload.from}: "${payload.content}"`);

    // Route to OpenClaw session
    if (runtime.handleInboundMessage) {
      runtime.handleInboundMessage({
        channel: "sms",
        from: payload.from,
        content: payload.content,
        messageId: payload.message_id,
        conversationId: payload.chat_id,
        timestamp: payload.timestamp,
        metadata: {
          agent_profile_id: payload.agent_profile_id,
          to: payload.to,
        },
      });
    }
  };
}
