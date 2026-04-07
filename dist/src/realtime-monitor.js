// SMS Polling Monitor — Checks for new inbound messages via Kudosity API
//
// The Supabase Realtime broadcast approach fails inside the OpenClaw gateway
// process due to WebSocket conflicts. This polling approach is simpler and
// works reliably in any environment.
//
// Polls GET /api/v1/conversations for new inbound messages every few seconds.
// For a single agent this is lightweight — one HTTP request every 3 seconds.
/**
 * Start polling for new inbound messages.
 * Returns a cleanup function to stop polling.
 */
export async function startRealtimeMonitor(params) {
    const { account, runtime, agentProfileId } = params;
    const { apiKey, baseUrl } = account.config;
    const { allowFrom, dmPolicy } = account.config;
    const pollIntervalMs = 3000;
    let lastSeenTimestamp = new Date().toISOString();
    let running = true;
    runtime.log?.info?.(`[sms] Starting polling monitor (${pollIntervalMs}ms interval)`);
    async function poll() {
        if (!running)
            return;
        try {
            // Fetch recent inbound messages since last check
            const res = await fetch(`${baseUrl}/messages/inbound?since=${encodeURIComponent(lastSeenTimestamp)}&agent_profile_id=${agentProfileId}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) {
                // If the polling endpoint doesn't exist yet, log once and keep trying
                if (res.status === 404) {
                    runtime.log?.debug?.("[sms] Polling endpoint not found — may not be deployed yet");
                }
                else {
                    runtime.log?.warn?.(`[sms] Poll failed: ${res.status}`);
                }
                return;
            }
            const data = await res.json();
            const messages = data.messages || [];
            for (const msg of messages) {
                const fromPhone = msg.from || "";
                // Check allowFrom
                if (dmPolicy === "pairing" && allowFrom && allowFrom.length > 0) {
                    const normalised = fromPhone.replace(/[^0-9]/g, "");
                    const isAllowed = allowFrom.some((a) => normalised.includes(a.replace(/[^0-9]/g, "")));
                    if (!isAllowed) {
                        runtime.log?.warn?.(`[sms] Rejected message from ${fromPhone} (not in allowFrom)`);
                        continue;
                    }
                }
                runtime.log?.info?.(`[sms] Inbound from ${fromPhone}: "${msg.content}"`);
                if (runtime.handleInboundMessage) {
                    runtime.handleInboundMessage({
                        channel: "sms",
                        from: fromPhone,
                        content: msg.content,
                        messageId: msg.message_id,
                        conversationId: msg.chat_id,
                        timestamp: msg.timestamp,
                        metadata: {
                            agent_profile_id: agentProfileId,
                            to: msg.to,
                        },
                    });
                }
                // Update watermark
                if (msg.timestamp > lastSeenTimestamp) {
                    lastSeenTimestamp = msg.timestamp;
                }
            }
        }
        catch (err) {
            if (err instanceof Error && err.name !== "AbortError") {
                runtime.log?.debug?.(`[sms] Poll error: ${err.message}`);
            }
        }
    }
    // Start polling loop
    const intervalId = setInterval(poll, pollIntervalMs);
    // Initial poll
    poll();
    return () => {
        running = false;
        clearInterval(intervalId);
        runtime.log?.info?.("[sms] Polling monitor stopped");
    };
}
//# sourceMappingURL=realtime-monitor.js.map