// index.js
import pkg from "@slack/bolt";
const { App, ExpressReceiver } = pkg;
import dotenv from "dotenv";
dotenv.config();

// Create custom Slack receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Store per-user auto-reply settings
const userSettings = {};

// Slash command: /autoreply
app.command("/autoreply", async ({ command, ack, respond }) => {
  // ✅ Acknowledge immediately to prevent Slack timeout
  await ack();

  const userId = command.user_id;
  const args = command.text.trim();

  try {
    console.log(`Received /autoreply command from ${command.user_name}: "${args}"`);

    if (args.toLowerCase() === "on") {
      userSettings[userId] = {
        enabled: true,
        message: userSettings[userId]?.message || "Hi! I’ll get back to you soon.",
      };
      await respond(`✅ Auto-reply turned ON for <@${userId}>.`);
    } else if (args.toLowerCase() === "off") {
      userSettings[userId] = {
        enabled: false,
        message: userSettings[userId]?.message || "",
      };
      await respond(`🛑 Auto-reply turned OFF for <@${userId}>.`);
    } else if (args.toLowerCase().startsWith("set ")) {
      const msg = args.slice(4).trim();
      if (!msg) return respond("❗ Please include a message after `set`.");
      userSettings[userId] = {
        enabled: userSettings[userId]?.enabled || false,
        message: msg,
      };
      await respond(`✍️ Auto-reply message updated for <@${userId}>.`);
    } else {
      await respond(`Usage:
- /autoreply on → enable auto-reply
- /autoreply off → disable auto-reply
- /autoreply set [message] → set custom reply message`);
    }
  } catch (err) {
    console.error("Error handling /autoreply:", err);
    await respond("⚠️ Something went wrong while processing your command.");
  }
});

// Listen for direct messages
app.event("message", async ({ event, client }) => {
  try {
    if (!event.user || event.subtype === "bot_message") return;

    const settings = userSettings[event.user];

    if (settings?.enabled) {
      await client.chat.postMessage({
        channel: event.channel,
        text: settings.message,
      });
    }
  } catch (err) {
    console.error("Error sending auto-reply:", err);
  }
});

// Start Express + Bolt server
const port = process.env.PORT || 3000;
(async () => {
  await app.start(port);
  console.log(`🚀 AutoReply bot running on port ${port}`);
})();
