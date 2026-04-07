// Stub type declarations for OpenClaw Plugin SDK
// These types are provided by the OpenClaw runtime at load time
declare module "openclaw/plugin-sdk/channel-core" {
  export function defineChannelPluginEntry(params: {
    id: string;
    name: string;
    description: string;
    plugin: any;
    registerCliMetadata?: (api: any) => void;
    registerFull?: (api: any) => void;
  }): any;
}

declare module "openclaw/plugin-sdk" {
  export interface ChannelPlugin<T = any> {
    id: string;
    meta: any;
    capabilities: any;
    reload: any;
    configSchema: any;
    config: any;
    security: any;
    messaging: any;
    outbound: any;
    status: any;
    gateway: any;
  }
  export interface ChannelAccountSnapshot {
    accountId: string;
    name: string;
    enabled: boolean;
    configured: boolean | undefined;
  }
  export type OpenClawConfig = any;
  export function buildChannelConfigSchema(schema: any): any;
  export const DEFAULT_ACCOUNT_ID: string;
  export function chunkTextForOutbound(text: string, limit: number): string[];
  export function formatAllowFromLowercase(params: any): string[];
  export function normalizeAccountId(id: string): string;
  export function setAccountEnabledInConfigSection(params: any): any;
  export function deleteAccountFromConfigSection(params: any): any;
}
