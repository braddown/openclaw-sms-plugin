import type { ResolvedSmsAccount } from "./types.js";
type OpenClawConfig = any;
export declare function listSmsAccountIds(cfg: OpenClawConfig): string[];
export declare function resolveDefaultSmsAccountId(cfg: OpenClawConfig): string | null;
export declare function resolveSmsAccountSync(params: {
    cfg: OpenClawConfig;
    accountId?: string | null;
}): ResolvedSmsAccount;
export declare function checkSmsAuthenticated(apiKey: string, baseUrl: string): Promise<boolean>;
export {};
