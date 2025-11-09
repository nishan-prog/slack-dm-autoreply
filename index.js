// index.js
const express = require("express");
const { App, ExpressReceiver } = require("@slack/bolt");
require("dotenv").config();

// Create custom receiver to handle Slack events
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

// Create Bolt app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Store user-specific autoreply states and messages
const userSettings = {};

// Slash command: /autoreply
app.command("/autoreply", async ({ command, ack, respond }) => {
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


// Listen for DMs and auto-reply
app.event("message", async ({ event, client }) => {
  if (!event.user || event.subtype === "bot_message") return;
  const userId = event.user;
  const settings = userSettings[userId];

  if (settings?.enabled) {
    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: settings.message,
      });
    } catch (err) {
      console.error("Failed to send auto-reply:", err);
    }
  }
});

// Start Express server
const expressApp = express();
expressApp.use("/slack/events", receiver.router);

const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => console.log(`🚀 AutoReply bot running on port ${PORT}`));
