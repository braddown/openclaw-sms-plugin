export async function sendSmsMessage(to, content, account, options) {
    const { config } = account;
    const timeout = options?.timeout || 10000;
    try {
        const message = {
            to: to.trim(),
            content: content.trim(),
            channel: "sms",
            ...(config.agentId ? { agent_id: config.agentId } : {}),
            metadata: {
                openclaw_session: options?.sessionId,
                agent: options?.agentContext || "kenny",
                account_id: account.accountId,
                timestamp: new Date().toISOString(),
            },
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(`${config.baseUrl}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const result = await response.json();
            if (!response.ok) {
                return {
                    ok: false,
                    error: new Error(result.error || `HTTP ${response.status}: ${response.statusText}`),
                };
            }
            if (result.status === "blocked") {
                return {
                    ok: false,
                    messageId: result.id,
                    error: new Error(`Message blocked by safety engine: ${result.safety?.denied_reason || "Safety check failed"}`),
                };
            }
            if (result.status === "failed") {
                return {
                    ok: false,
                    messageId: result.id,
                    error: new Error(result.error || "Message delivery failed"),
                };
            }
            return {
                ok: true,
                messageId: result.id,
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === "AbortError") {
                return {
                    ok: false,
                    error: new Error(`Request timeout after ${timeout}ms`),
                };
            }
            throw error;
        }
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}
export function chunkSmsText(text, maxLength = 1600) {
    if (text.length <= maxLength) {
        return [text];
    }
    const chunks = [];
    let remaining = text;
    while (remaining.length > maxLength) {
        // Try to break at sentence boundaries
        let breakIndex = remaining.lastIndexOf(". ", maxLength - 1);
        if (breakIndex === -1) {
            // Try to break at word boundaries
            breakIndex = remaining.lastIndexOf(" ", maxLength - 1);
        }
        if (breakIndex === -1) {
            // Force break if no good boundary found
            breakIndex = maxLength;
        }
        const chunk = remaining.slice(0, breakIndex).trim();
        if (chunk) {
            chunks.push(chunk);
        }
        remaining = remaining.slice(breakIndex).trim();
    }
    if (remaining) {
        chunks.push(remaining);
    }
    return chunks;
}
//# sourceMappingURL=send.js.map