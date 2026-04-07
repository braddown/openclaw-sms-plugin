import { buildChannelConfigSchema, DEFAULT_ACCOUNT_ID, formatAllowFromLowercase, setAccountEnabledInConfigSection, deleteAccountFromConfigSection, } from "openclaw/plugin-sdk";
import { listSmsAccountIds, resolveDefaultSmsAccountId, resolveSmsAccountSync, checkSmsAuthenticated, } from "./accounts.js";
import { SmsConfigSchema } from "./config-schema.js";
import { sendSmsMessage, chunkSmsText } from "./send.js";
import { createSmsWebhookHandler } from "./monitor.js";
import { startRealtimeMonitor } from "./realtime-monitor.js";
const meta = {
    id: "sms",
    label: "SMS",
    selectionLabel: "SMS (via Kudosity)",
    docsPath: "/channels/sms",
    docsLabel: "sms",
    blurb: "SMS messaging via Kudosity Agent Communications Platform with built-in safety controls",
    order: 50,
    quickstartAllowFrom: true,
};
export const smsPlugin = {
    id: "sms",
    meta,
    capabilities: {
        chatTypes: ["direct"], // SMS is 1:1 only
        media: false, // Text only for now
        reactions: false, // No reactions
        threads: false, // No threading
        polls: false, // No polls  
        nativeCommands: false, // No native commands
        blockStreaming: true, // Block streaming due to SMS constraints
    },
    reload: { configPrefixes: ["channels.sms"] },
    configSchema: buildChannelConfigSchema(SmsConfigSchema),
    config: {
        listAccountIds: (cfg) => listSmsAccountIds(cfg),
        resolveAccount: (cfg, accountId) => resolveSmsAccountSync({ cfg, accountId }),
        defaultAccountId: (cfg) => resolveDefaultSmsAccountId(cfg),
        setAccountEnabled: ({ cfg, accountId, enabled }) => setAccountEnabledInConfigSection({
            cfg,
            sectionKey: "sms",
            accountId,
            enabled,
            allowTopLevel: true,
        }),
        deleteAccount: ({ cfg, accountId }) => deleteAccountFromConfigSection({
            cfg,
            sectionKey: "sms",
            accountId,
            clearBaseFields: [
                "apiKey",
                "baseUrl",
                "agentId",
                "name",
                "allowFrom",
                "dmPolicy",
                "callbackSecret",
                "webhookPath",
            ],
        }),
        isConfigured: async (account) => {
            try {
                return await checkSmsAuthenticated(account.config.apiKey, account.config.baseUrl);
            }
            catch {
                return false;
            }
        },
        describeAccount: (account) => ({
            accountId: account.accountId,
            name: account.name,
            enabled: account.enabled,
            configured: undefined, // Will be set by isConfigured
        }),
        resolveAllowFrom: ({ cfg, accountId }) => (resolveSmsAccountSync({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
        formatAllowFrom: ({ allowFrom }) => formatAllowFromLowercase({ allowFrom, stripPrefixRe: /^(sms|phone):/i }),
    },
    security: {
        resolveDmPolicy: ({ cfg, accountId, account }) => {
            const resolvedAccountId = accountId ?? account.accountId ?? DEFAULT_ACCOUNT_ID;
            const basePath = `channels.sms${resolvedAccountId !== DEFAULT_ACCOUNT_ID ? `.accounts.${resolvedAccountId}` : ""}.`;
            return {
                policy: account.config.dmPolicy ?? "pairing",
                allowFrom: account.config.allowFrom ?? [],
                policyPath: `${basePath}dmPolicy`,
                allowFromPath: `${basePath}allowFrom`,
                approveHint: "To approve this SMS sender, add their phone number to your SMS allowFrom list",
                normalizeEntry: (raw) => raw.replace(/^(sms|phone):/i, ""),
            };
        },
    },
    messaging: {
        normalizeTarget: (raw) => {
            const trimmed = raw?.trim();
            if (!trimmed) {
                return undefined;
            }
            // Remove channel prefix and normalize phone number
            return trimmed.replace(/^(sms|phone):/i, "").replace(/[^\d+]/g, "");
        },
        targetResolver: {
            looksLikeId: (raw) => {
                const trimmed = raw.trim();
                if (!trimmed) {
                    return false;
                }
                // Phone number pattern (E.164 format)
                return /^\+?\d{10,15}$/.test(trimmed.replace(/[^\d+]/g, ""));
            },
            hint: "+61412345678",
        },
    },
    outbound: {
        deliveryMode: "direct",
        chunker: (text) => chunkSmsText(text, 1600),
        chunkerMode: "text",
        textChunkLimit: 1600,
        sendText: async ({ to, text, accountId, cfg, session }) => {
            try {
                const account = resolveSmsAccountSync({ cfg, accountId });
                const result = await sendSmsMessage(to, text, account, {
                    sessionId: session?.id,
                    agentContext: "kenny",
                });
                return {
                    channel: "sms",
                    ok: result.ok,
                    messageId: result.messageId ?? "",
                    error: result.error,
                };
            }
            catch (error) {
                return {
                    channel: "sms",
                    ok: false,
                    messageId: "",
                    error: error instanceof Error ? error : new Error(String(error)),
                };
            }
        },
    },
    status: {
        defaultRuntime: {
            accountId: DEFAULT_ACCOUNT_ID,
            running: false,
            lastStartAt: null,
            lastStopAt: null,
            lastError: null,
        },
        buildChannelSummary: ({ snapshot }) => ({
            configured: snapshot.configured ?? false,
            running: snapshot.running ?? false,
            lastStartAt: snapshot.lastStartAt ?? null,
            lastStopAt: snapshot.lastStopAt ?? null,
            lastError: snapshot.lastError ?? null,
            lastProbeAt: snapshot.lastProbeAt ?? null,
        }),
        buildAccountSnapshot: async ({ account, runtime }) => {
            const configured = await checkSmsAuthenticated(account.config.apiKey, account.config.baseUrl);
            return {
                accountId: account.accountId,
                name: account.name,
                enabled: account.enabled,
                configured,
                running: runtime?.running ?? false,
                lastStartAt: runtime?.lastStartAt ?? null,
                lastStopAt: runtime?.lastStopAt ?? null,
                lastError: runtime?.lastError ?? null,
                lastInboundAt: runtime?.lastInboundAt ?? null,
                lastOutboundAt: runtime?.lastOutboundAt ?? null,
                dmPolicy: account.config.dmPolicy ?? "pairing",
            };
        },
    },
    gateway: {
        startAccount: async (ctx) => {
            const account = ctx.account;
            ctx.log?.info(`[${account.accountId}] Starting SMS provider via Kudosity`);
            try {
                // Test API connectivity
                const authenticated = await checkSmsAuthenticated(account.config.apiKey, account.config.baseUrl);
                if (!authenticated) {
                    throw new Error("Kudosity API authentication failed - check your API key");
                }
                // Resolve agent profile ID for realtime filtering
                let agentProfileId = account.config.agentId;
                if (!agentProfileId) {
                    // Fetch from API if not configured
                    try {
                        const res = await fetch(`${account.config.baseUrl}/agents`, {
                            headers: { Authorization: `Bearer ${account.config.apiKey}` },
                        });
                        if (res.ok) {
                            const data = await res.json();
                            agentProfileId = data.data?.[0]?.id;
                        }
                    }
                    catch {
                        // Non-fatal — will still work, just won't filter by agent
                    }
                }
                // Primary: Supabase Realtime (works from localhost, no public URL needed)
                let realtimeCleanup;
                try {
                    realtimeCleanup = await startRealtimeMonitor({
                        account,
                        runtime: {
                            handleInboundMessage: ctx.runtime.handleInboundMessage,
                            log: ctx.log,
                        },
                        agentProfileId: agentProfileId || "",
                    });
                    ctx.log?.info(`[${account.accountId}] Supabase Realtime monitor started`);
                }
                catch (err) {
                    ctx.log?.warn(`[${account.accountId}] Realtime monitor failed, falling back to webhook: ${err}`);
                }
                // Fallback: Register webhook route (for when gateway is publicly accessible)
                const webhookPath = account.config.webhookPath || "/channels/sms/webhook";
                const handler = createSmsWebhookHandler({
                    account,
                    runtime: {
                        handleInboundMessage: ctx.runtime.handleInboundMessage,
                        log: ctx.log,
                    },
                });
                ctx.registerHttpRoute?.({
                    path: webhookPath,
                    handler,
                });
                ctx.log?.info(`[${account.accountId}] SMS webhook also registered at ${webhookPath} (fallback)`);
                ctx.setStatus({
                    accountId: account.accountId,
                    running: true,
                    lastStartAt: new Date().toISOString(),
                    lastError: null,
                });
                // Store cleanup for shutdown
                if (realtimeCleanup) {
                    ctx._smsRealtimeCleanup = realtimeCleanup;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                ctx.log?.error(`[${account.accountId}] SMS provider failed to start: ${errorMessage}`);
                ctx.setStatus({
                    accountId: account.accountId,
                    running: false,
                    lastError: errorMessage,
                });
                throw error;
            }
        },
    },
};
//# sourceMappingURL=channel.js.map