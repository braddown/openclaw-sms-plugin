import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { smsPlugin } from "./src/channel.js";
export default defineChannelPluginEntry({
    id: "sms",
    name: "SMS (Kudosity)",
    description: "SMS messaging via Kudosity Agent Communications Platform with built-in safety controls",
    plugin: smsPlugin,
});
//# sourceMappingURL=index.js.map