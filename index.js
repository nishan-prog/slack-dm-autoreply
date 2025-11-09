// index.js
import pkg from "@slack/bolt";
const { App } = pkg;
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
const stateFile = "./state.json";

// Load or initialize state
let state = { users: {} };
try {
  state = JSON.parse(fs.readFileSync(stateFile));
} catch {
  console.log("No state.json found, starting fresh.");
}

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Slash command to toggle auto-reply on/off and set custom message
app.command("/autoreply", async ({ command, ack, respond }) => {
  await ack();
  const userId = command.user_id;

  if (!state.users[userId]) {
    state.users[userId] = { enabled: false, message: "Hi! Thank you for your message." };
  }

  const args = command.text.trim().split(" ");
  const subCommand = args[0]?.toLowerCase();

  if (subCommand === "on") {
    state.users[userId].enabled = true;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    await respond(`✅ Auto-reply turned ON. Current message:\n"${state.users[userId].message}"`);
  } else if (subCommand === "off") {
    state.users[userId].enabled = false;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    await respond("❌ Auto-reply turned OFF.");
  } else if (subCommand === "set") {
    const customMessage = args.slice(1).join(" ");
    if (customMessage) {
      state.users[userId].message = customMessage;
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      await respond(`✏️ Auto-reply message updated to:\n"${customMessage}"`);
    } else {
      await respond("⚠️ Please provide a message after `set`.");
    }
  } else {
    await respond("Usage: `/autoreply on|off|set <message>`");
  }
});

// Listen for messages forwarded by the forwarder app
app.message(/^\[(U[A-Z0-9]+)\]\s(.+)$/, async ({ message, context, client }) => {
  try {
    const matches = message.text.match(/^\[(U[A-Z0-9]+)\]\s(.+)$/);
    if (!matches) return;

    const targetUser = matches[1];
    const originalText = matches[2];

    if (state.users[targetUser]?.enabled) {
      const replyText = state.users[targetUser].message;

      // Send auto-reply to sender
      await client.chat.postMessage({
        channel: message.user,
        text: replyText,
      });
    }
  } catch (err) {
    console.error("Auto-reply error:", err);
  }
});

// Start the bot
const port = process.env.PORT || 3000;
(async () => {
  await app.start(port);
  console.log(`🚀 AutoReply bot running on port ${port}`);
})();
