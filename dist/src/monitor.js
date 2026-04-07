// SMS Monitor — Receives inbound messages via Kudosity agent callback
// Registers an HTTP route on the OpenClaw gateway (no separate server needed).
// The agent's callback_url is set to point to this route.
import { createHmac } from "node:crypto";
/**
 * Verify HMAC-SHA256 signature from Kudosity callback.
 * Returns true if no secret is configured (signature is optional).
 */
function verifySignature(body, signature, secret) {
    if (!secret)
        return true; // No secret configured, skip verification
    if (!signature)
        return false; // Secret configured but no signature provided
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    return signature === expected || signature === `sha256=${expected}`;
}
/**
 * Create the HTTP request handler for the SMS webhook route.
 * This is registered on the gateway via registerHttpRoute.
 */
export function createSmsWebhookHandler(params) {
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
            rawBody = await new Promise((resolve, reject) => {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                req.on("error", reject);
                // 10s timeout
                setTimeout(() => reject(new Error("Body read timeout")), 10_000);
            });
        }
        catch (err) {
            runtime.log?.error?.(`[sms] Failed to read webhook body: ${err}`);
            res.writeHead(400);
            res.end("Bad Request");
            return;
        }
        // Verify HMAC signature
        const signature = req.headers["x-kudosity-signature"];
        if (!verifySignature(rawBody, signature, callbackSecret)) {
            runtime.log?.warn?.("[sms] Webhook signature verification failed");
            res.writeHead(401);
            res.end("Unauthorized");
            return;
        }
        // Parse payload
        let payload;
        try {
            payload = JSON.parse(rawBody);
        }
        catch {
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
//# sourceMappingURL=monitor.js.map