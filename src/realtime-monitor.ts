// SMS Realtime Monitor — Receives inbound messages via Supabase Realtime
//
// Instead of requiring a public URL for webhook callbacks, this monitor
// connects OUTBOUND to Supabase Realtime and subscribes to new messages
// on the messages table. Works from localhost with zero infrastructure.
//
// This is how OpenClaw channels work — the agent connects OUT to the
// service, not the other way around.

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

type SupabaseRealtimePayload = {
  new: {
    id: string;
    chat_id: string;
    content: string;
    direction: string;
    channel: string;
    source: string;
    status: string;
    sender_id: string;
    ai_processing_info: Record<string, unknown>;
    created_at: string;
  };
};

/**
 * Start a Supabase Realtime subscription for inbound messages.
 *
 * The plugin discovers the Supabase connection details from the Kudosity
 * platform API, then opens a persistent connection to listen for new
 * inbound messages routed to this agent.
 *
 * Returns a cleanup function to stop the subscription.
 */
export async function startRealtimeMonitor(params: {
  account: ResolvedSmsAccount;
  runtime: RealtimeMonitorRuntime;
  agentProfileId: string;
}): Promise<() => void> {
  const { account, runtime, agentProfileId } = params;
  const { apiKey, baseUrl } = account.config;
  const { allowFrom, dmPolicy } = account.config;

  runtime.log?.info?.("[sms] Starting Supabase Realtime monitor for inbound messages");

  // 1. Discover Supabase connection details from the platform
  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    const infoRes = await fetch(`${baseUrl}/realtime-config`, {
      headers: { Authorization: `Bearer ${apiKey}` },
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

  // 2. Connect to Supabase Realtime
  // Dynamic import since @supabase/supabase-js may not be a direct dependency
  let supabase: any;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    runtime.log?.error?.("[sms] Failed to import @supabase/supabase-js. Install it: npm install @supabase/supabase-js");
    throw err;
  }

  // 3. Subscribe to INSERT events on the messages table
  const channelName = `sms-inbound:${agentProfileId}:${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `direction=eq.inbound`,
      },
      (payload: SupabaseRealtimePayload) => {
        const msg = payload.new;

        // Only process messages routed to this agent
        const agentId = msg.ai_processing_info?.agent_profile_id;
        if (agentId !== agentProfileId) {
          return;
        }

        const fromPhone = (msg.ai_processing_info?.from_phone as string) || "";
        const toPhone = (msg.ai_processing_info?.to_phone as string) || "";

        // Check allowFrom if dmPolicy is pairing
        if (dmPolicy === "pairing" && allowFrom && allowFrom.length > 0) {
          const normalised = fromPhone.replace(/[^0-9]/g, "");
          const isAllowed = allowFrom.some((a) =>
            normalised.includes(a.replace(/[^0-9]/g, ""))
          );
          if (!isAllowed) {
            runtime.log?.warn?.(`[sms] Rejected message from ${fromPhone} (not in allowFrom)`);
            return;
          }
        }

        runtime.log?.info?.(`[sms] Realtime inbound from ${fromPhone}: "${msg.content}"`);

        // Route to OpenClaw session
        if (runtime.handleInboundMessage) {
          runtime.handleInboundMessage({
            channel: "sms",
            from: fromPhone,
            content: msg.content,
            messageId: msg.id,
            conversationId: msg.chat_id,
            timestamp: msg.created_at,
            metadata: {
              agent_profile_id: agentId,
              to: toPhone,
              source: msg.source,
            },
          });
        }
      }
    )
    .subscribe((status: string) => {
      runtime.log?.info?.(`[sms] Realtime subscription status: ${status}`);
    });

  runtime.log?.info?.("[sms] Supabase Realtime monitor started — listening for inbound messages");

  // Return cleanup function
  return () => {
    runtime.log?.info?.("[sms] Stopping Supabase Realtime monitor");
    supabase.removeChannel(channel);
  };
}
