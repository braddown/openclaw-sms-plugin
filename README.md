# OpenClaw SMS Channel Plugin

SMS messaging integration for OpenClaw via the Kudosity Agent Communications Platform.

## Features

- **Direct SMS messaging** - Send and receive SMS messages through OpenClaw
- **Built-in safety controls** - Leverages Kudosity's 6-layer safety engine
- **Real-time webhooks** - Immediate delivery of inbound SMS messages
- **Phone number allowlisting** - Control who can message your agent
- **Production-ready** - Robust error handling and monitoring

## Quick Start

### 1. Get Kudosity API Credentials

1. Visit https://platform.kudosity.dev/
2. Register as an agent: `POST /api/v1/register` with `{"agent_name": "Your Agent Name"}`
3. Get your API key (starts with `kd_live_` for production or `kd_test_` for sandbox)

### 2. Configure OpenClaw

Add to your OpenClaw config:

```yaml
channels:
  sms:
    enabled: true
    apiKey: "kd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Your Kudosity API key
    allowFrom:                                          # Phone numbers allowed to message you
      - "+61438333061"
    dmPolicy: "pairing"                                # Require allowFrom approval
```

### 3. Start OpenClaw

The SMS channel will automatically start and listen for inbound messages via webhooks.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable the SMS channel |
| `apiKey` | string | **required** | Kudosity API key (`kd_live_...` or `kd_test_...`) |
| `baseUrl` | string | `https://platform.kudosity.dev/api/v1` | Kudosity API base URL |
| `agentId` | string | _optional_ | Kudosity agent profile ID |
| `allowFrom` | string[] | `[]` | Allowed phone numbers (E.164 format) |
| `dmPolicy` | string | `"pairing"` | Message policy: `"open"` or `"pairing"` |
| `webhookPort` | number | `3001` | Port for receiving webhooks |
| `webhookPath` | string | `"/channels/sms/webhook"` | Webhook endpoint path |

## Usage

### Sending SMS

From any OpenClaw session or agent:

```
Send SMS to +61412345678: Hello from OpenClaw!
```

### Receiving SMS

When someone sends an SMS to your Kudosity-configured phone number:
1. Kudosity receives the message
2. Webhook delivers it to OpenClaw
3. OpenClaw routes it to your agent session
4. Your agent can respond with full context and tools

## Webhook Setup

The plugin automatically sets up a webhook endpoint at:
```
http://your-openclaw-instance.com:3001/channels/sms/webhook
```

**For production:**
1. Configure your Kudosity account to send webhooks to this URL
2. Ensure the port is accessible from the internet
3. Consider using a reverse proxy (nginx, Cloudflare) for HTTPS

## Phone Number Format

Always use E.164 international format:
- ✅ `+61412345678` (Australia)
- ✅ `+1555123456` (US)
- ❌ `0412345678` (local format)
- ❌ `(555) 123-456` (formatted)

## Safety & Security

### Kudosity Safety Engine
Every message passes through 6 safety checks:
1. **Opt-in verification** - Recipient consent
2. **Blocklist** - Global and per-agent blocks  
3. **Rate limiting** - 5 messages/hour/recipient (default)
4. **Quiet hours** - Time-based blocking
5. **Content filtering** - Length and content rules
6. **NLP analysis** - AI-powered content evaluation

### Access Control
- Use `allowFrom` to restrict who can message your agent
- Set `dmPolicy: "pairing"` to require explicit approval
- Messages from unknown numbers are logged but not processed

## Troubleshooting

### Common Issues

**"Kudosity API authentication failed"**
- Check your API key in the config
- Ensure you're using the correct environment (`kd_live_` vs `kd_test_`)
- Test with: `curl -H "Authorization: Bearer YOUR_KEY" https://platform.kudosity.dev/api/v1/health`

**"No inbound messages"**
- Verify webhook endpoint is accessible: `http://your-ip:3001/channels/sms/webhook`
- Check webhook configuration in Kudosity dashboard
- Review OpenClaw logs for webhook errors

**"Messages blocked by safety engine"**
- Check rate limits (5 messages/hour/recipient default)
- Verify quiet hours settings
- Review message content for policy violations

### Debugging

Enable debug logging:
```yaml
channels:
  sms:
    # ... other config
    
logging:
  level: debug
  channels: ["sms"]
```

Check webhook health:
```bash
curl http://localhost:3001/health
```

## Development

### Plugin Structure

```
extensions/sms/
├── index.ts              # Plugin export
├── src/
│   ├── channel.ts        # Main channel plugin
│   ├── accounts.ts       # Account management  
│   ├── config-schema.ts  # Configuration schema
│   ├── monitor.ts        # Webhook server
│   ├── send.ts          # Outbound messaging
│   └── types.ts         # TypeScript definitions
└── package.json         # Plugin manifest
```

### Building

The plugin is written in TypeScript and follows OpenClaw's plugin architecture. No build step required - OpenClaw compiles it automatically.

### Testing

1. Set up sandbox environment with `kd_test_` API key
2. Use test phone numbers: `+61400000xxx`
3. Send test messages via the API
4. Verify webhook delivery

## Support

- **Kudosity Platform**: https://platform.kudosity.dev/
- **OpenClaw Docs**: https://docs.openclaw.ai/channels/
- **Issues**: Report via OpenClaw GitHub repository

## License

This plugin is part of the OpenClaw project and follows the same license terms.