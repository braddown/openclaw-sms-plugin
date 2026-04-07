// SMS Realtime Monitor — Receives inbound messages via Supabase Realtime Broadcast
//
// Instead of requiring a public URL for webhook callbacks, this monitor
// connects OUTBOUND to Supabase Realtime and subscribes to a broadcast
// channel for this agent. Works from localhost with zero infrastructure.
//
// The Kudosity platform broadcasts inbound messages to channel
// `agent:{agentProfileId}:inbound` — the plugin just listens.

import type { ResolvedSmsAccount } from "./types.js";

export type RealtimeMonitorRuntime = {
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

type BroadcastPayload = {
  message_id: string;
  chat_id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  agent_profile_id: string;
  provider_message_id?: string | null;
};

/**
 * Start a Supabase Realtime Broadcast subscription for inbound messages.
 *
 * The plugin subscribes to the `agent:{agentProfileId}:inbound` channel.
 * The Kudosity platform broadcasts to this channel when an inbound SMS
 * is routed to the agent. No RLS or authentication needed for broadcasts.
 *
 * Returns a cleanup function to stop the subscription.
 */
export async function startRealtimeMonitor(params: {
  account: ResolvedSmsAccount;
  runtime: RealtimeMonitorRuntime;
  agentProfileId: string;
}): Promise<() => void> {
  const { account, runtime, agentProfileId } = params;
  const { allowFrom, dmPolicy } = account.config;

  if (!agentProfileId) {
    throw new Error("agentProfileId is required for realtime monitor");
  }

  runtime.log?.info?.(`[sms] Starting Supabase Realtime broadcast monitor for agent ${agentProfileId}`);

  // 1. Get Supabase connection details from the platform
  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    const infoRes = await fetch(`${account.config.baseUrl}/realtime-config`, {
      headers: { Authorization: `Bearer ${account.config.apiKey}` },
    });

    if (!infoRes.ok) {
      throw new Error(`Failed to get realtime config: ${infoRes.status}`);
    }

    const info = await infoRes.json();
    supabaseUrl = info.supabase_url;
    supabaseAnonKey = info.supabase_anon_key;
  } catch (err) {
    runtime.log?.error?.(`[sms] Failed to get realtime config: ${err}`);
    throw err;
  }

  // 2. Connect to Supabase
  let supabase: any;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    runtime.log?.error?.("[sms] Failed to import @supabase/supabase-js. Install it: npm install @supabase/supabase-js");
    throw err;
  }

  // 3. Subscribe to the agent's broadcast channel
  const channelName = `agent:${agentProfileId}:inbound`;
  const channel = supabase
    .channel(channelName)
    .on("broadcast", { event: "message.inbound" }, (event: { payload: BroadcastPayload }) => {
      const payload = event.payload;

      if (!payload?.from || !payload?.content) {
        runtime.log?.warn?.("[sms] Broadcast missing from or content");
        return;
      }

      // Check allowFrom if dmPolicy is pairing
      if (dmPolicy === "pairing" && allowFrom && allowFrom.length > 0) {
        const normalised = payload.from.replace(/[^0-9]/g, "");
        const isAllowed = allowFrom.some((a) =>
          normalised.includes(a.replace(/[^0-9]/g, ""))
        );
        if (!isAllowed) {
          runtime.log?.warn?.(`[sms] Rejected broadcast from ${payload.from} (not in allowFrom)`);
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
    })
    .subscribe((status: string) => {
      runtime.log?.info?.(`[sms] Broadcast subscription status: ${status}`);
    });

  runtime.log?.info?.(`[sms] Listening on broadcast channel: ${channelName}`);

  // Return cleanup function
  return () => {
    runtime.log?.info?.("[sms] Stopping broadcast monitor");
    supabase.removeChannel(channel);
  };
}
