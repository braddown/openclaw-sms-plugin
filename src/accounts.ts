import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk";
import type { ResolvedSmsAccount, SmsConfig } from "./types.js";

export function listSmsAccountIds(cfg: OpenClawConfig): string[] {
  const smsConfig = cfg.channels?.sms;
  if (!smsConfig || typeof smsConfig !== "object") {
    return [];
  }

  const ids = new Set<string>();

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

export function resolveDefaultSmsAccountId(cfg: OpenClawConfig): string | null {
  const accountIds = listSmsAccountIds(cfg);
  if (accountIds.includes(DEFAULT_ACCOUNT_ID)) {
    return DEFAULT_ACCOUNT_ID;
  }
  return accountIds[0] || null;
}

export function resolveSmsAccountSync(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedSmsAccount {
  const { cfg, accountId } = params;
  const resolvedAccountId = normalizeAccountId(accountId) || DEFAULT_ACCOUNT_ID;
  
  const smsConfig = cfg.channels?.sms;
  if (!smsConfig || typeof smsConfig !== "object") {
    throw new Error("SMS channel not configured");
  }

  let config: SmsConfig;
  let name: string;

  if (resolvedAccountId === DEFAULT_ACCOUNT_ID) {
    // Use top-level config for default account
    config = {
      apiKey: smsConfig.apiKey,
      baseUrl: smsConfig.baseUrl || "https://platform.kudosity.dev/api/v1",
      agentId: smsConfig.agentId,
      allowFrom: smsConfig.allowFrom || [],
      dmPolicy: smsConfig.dmPolicy || "pairing",
      webhookPort: smsConfig.webhookPort || 3001,
      webhookPath: smsConfig.webhookPath || "/channels/sms/webhook",
    };
    name = smsConfig.name || "SMS";
  } else {
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
      webhookPort: accountConfig.webhookPort || smsConfig.webhookPort || 3001,
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
    config: config as ResolvedSmsAccount["config"],
  };
}

export async function checkSmsAuthenticated(apiKey: string, baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}