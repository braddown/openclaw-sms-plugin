// These are simple utilities — defined locally to avoid SDK version issues
const DEFAULT_ACCOUNT_ID = "default";
function normalizeAccountId(id) {
    return (id || "").trim() || DEFAULT_ACCOUNT_ID;
}
export function listSmsAccountIds(cfg) {
    const smsConfig = cfg.channels?.sms;
    if (!smsConfig || typeof smsConfig !== "object") {
        return [];
    }
    const ids = new Set();
    // Check for top-level config (default account)
    if (smsConfig.enabled && smsConfig.apiKey) {
        ids.add(DEFAULT_ACCOUNT_ID);
    }
    // Check for named accounts
    const accounts = smsConfig.accounts;
    if (accounts && typeof accounts === "object") {
        for (const [accountId, accountConfig] of Object.entries(accounts)) {
            if (accountConfig && typeof accountConfig === "object" && accountConfig.enabled) {
                ids.add(accountId);
            }
        }
    }
    return Array.from(ids).sort();
}
export function resolveDefaultSmsAccountId(cfg) {
    const accountIds = listSmsAccountIds(cfg);
    if (accountIds.includes(DEFAULT_ACCOUNT_ID)) {
        return DEFAULT_ACCOUNT_ID;
    }
    return accountIds[0] || null;
}
export function resolveSmsAccountSync(params) {
    const { cfg, accountId } = params;
    const resolvedAccountId = normalizeAccountId(accountId) || DEFAULT_ACCOUNT_ID;
    const smsConfig = cfg.channels?.sms;
    if (!smsConfig || typeof smsConfig !== "object") {
        throw new Error("SMS channel not configured");
    }
    let config;
    let name;
    if (resolvedAccountId === DEFAULT_ACCOUNT_ID) {
        // Use top-level config for default account
        config = {
            apiKey: smsConfig.apiKey,
            baseUrl: smsConfig.baseUrl || "https://platform.kudosity.dev/api/v1",
            agentId: smsConfig.agentId,
            allowFrom: smsConfig.allowFrom || [],
            dmPolicy: smsConfig.dmPolicy || "pairing",
            callbackSecret: smsConfig.callbackSecret,
            webhookPath: smsConfig.webhookPath || "/channels/sms/webhook",
        };
        name = smsConfig.name || "SMS";
    }
    else {
        // Use account-specific config
        const accounts = smsConfig.accounts;
        const accountConfig = accounts?.[resolvedAccountId];
        if (!accountConfig || typeof accountConfig !== "object") {
            throw new Error(`SMS account "${resolvedAccountId}" not found`);
        }
        config = {
            apiKey: accountConfig.apiKey || smsConfig.apiKey,
            baseUrl: accountConfig.baseUrl || smsConfig.baseUrl || "https://platform.kudosity.dev/api/v1",
            agentId: accountConfig.agentId || smsConfig.agentId,
            allowFrom: accountConfig.allowFrom || smsConfig.allowFrom || [],
            dmPolicy: accountConfig.dmPolicy || smsConfig.dmPolicy || "pairing",
            callbackSecret: accountConfig.callbackSecret || smsConfig.callbackSecret,
            webhookPath: accountConfig.webhookPath || smsConfig.webhookPath || "/channels/sms/webhook",
        };
        name = accountConfig.name || resolvedAccountId;
    }
    if (!config.apiKey) {
        throw new Error(`SMS account "${resolvedAccountId}": missing API key`);
    }
    if (!config.baseUrl) {
        throw new Error(`SMS account "${resolvedAccountId}": missing base URL`);
    }
    return {
        accountId: resolvedAccountId,
        name,
        enabled: true,
        config: config,
    };
}
export async function checkSmsAuthenticated(apiKey, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/register/status`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=accounts.js.map