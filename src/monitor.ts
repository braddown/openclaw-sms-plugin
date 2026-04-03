import express from "express";
import type { Request, Response } from "express";
import type { ResolvedSmsAccount, KudosityWebhookPayload } from "./types.js";
import type { OpenClawConfig } from "openclaw/plugin-sdk";

type MonitorContext = {
  account: ResolvedSmsAccount;
  config: OpenClawConfig;
  runtime: {
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
    };
  };
  abortSignal: AbortSignal;
  statusSink: (patch: {
    accountId: string;
    running?: boolean;
    lastInboundAt?: string;
    lastError?: string;
  }) => void;
};

export async function monitorSmsProvider(context: MonitorContext): Promise<void> {
  const { account, runtime, abortSignal, statusSink } = context;
  const { config } = account;
  
  const webhookPort = config.webhookPort || 3001;
  const webhookPath = config.webhookPath || "/channels/sms/webhook";

  runtime.log?.info(`[${account.accountId}] Starting SMS webhook server on port ${webhookPort}${webhookPath}`);

  const app = express();
  
  // Middleware for JSON parsing
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      account: account.accountId,
      timestamp: new Date().toISOString() 
    });
  });

  // Webhook endpoint for inbound SMS
  app.post(webhookPath, (req: Request, res: Response) => {
    try {
      const payload = req.body as KudosityWebhookPayload;
      
      runtime.log?.info(`[${account.accountId}] Received webhook: ${payload.event}`);

      // Handle inbound messages
      if (payload.event === "message.inbound" && payload.data.content && payload.data.from) {
        const { data } = payload;
        
        // Check allowFrom list if dmPolicy is pairing
        if (config.dmPolicy === "pairing" && config.allowFrom) {
          const isAllowed = config.allowFrom.some(allowed => 
            data.from?.includes(allowed.replace(/[^0-9]/g, ""))
          );
          
          if (!isAllowed) {
            runtime.log?.warn(
              `[${account.accountId}] Rejected message from ${data.from} (not in allowFrom list)`
            );
            res.status(200).send("OK");
            return;
          }
        }

        // Route to OpenClaw
        if (runtime.handleInboundMessage) {
          runtime.handleInboundMessage({
            channel: "sms",
            from: data.from,
            content: data.content,
            messageId: data.id,
            conversationId: data.conversation_id,
            timestamp: data.created_at || new Date().toISOString(),
            metadata: {
              provider_message_id: data.provider_message_id,
              agent_profile_id: data.agent_profile_id,
              webhook_event: payload.event,
              webhook_timestamp: payload.timestamp,
            },
          });

          // Update status
          statusSink({
            accountId: account.accountId,
            lastInboundAt: new Date().toISOString(),
          });
        }
      }
      
      // Log other events for debugging
      else if (payload.event === "message.sent") {
        runtime.log?.info(`[${account.accountId}] Message sent: ${payload.data.id}`);
      }
      else if (payload.event === "message.failed") {
        runtime.log?.error(`[${account.accountId}] Message failed: ${payload.data.id}`);
      }
      else if (payload.event === "safety.blocked") {
        runtime.log?.warn(`[${account.accountId}] Message blocked by safety engine: ${payload.data.id}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      runtime.log?.error(`[${account.accountId}] Webhook error: ${String(error)}`);
      
      statusSink({
        accountId: account.accountId,
        lastError: `Webhook error: ${String(error)}`,
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Start server
  const server = app.listen(webhookPort, () => {
    runtime.log?.info(`[${account.accountId}] SMS webhook server listening on port ${webhookPort}`);
    
    statusSink({
      accountId: account.accountId,
      running: true,
    });
  });

  // Error handling
  server.on("error", (error) => {
    runtime.log?.error(`[${account.accountId}] Server error: ${String(error)}`);
    
    statusSink({
      accountId: account.accountId,
      running: false,
      lastError: `Server error: ${String(error)}`,
    });
  });

  // Graceful shutdown
  const cleanup = () => {
    runtime.log?.info(`[${account.accountId}] Shutting down SMS webhook server`);
    
    server.close(() => {
      runtime.log?.info(`[${account.accountId}] SMS webhook server stopped`);
      
      statusSink({
        accountId: account.accountId,
        running: false,
      });
    });
  };

  abortSignal.addEventListener("abort", cleanup);

  // Keep the process alive until aborted
  return new Promise<void>((resolve) => {
    abortSignal.addEventListener("abort", () => {
      cleanup();
      resolve();
    });
  });
}