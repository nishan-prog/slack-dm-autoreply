import express from "express";
import { App, ExpressReceiver } from "@slack/bolt";

// ✅ Load environment variables
import dotenv from "dotenv";
dotenv.config();

// ✅ Create a custom receiver so we can define the port manually
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

// ✅ Create the Bolt app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// ✅ Simple memory storage for each user's auto-reply status
const userSettings = {};

// ✅ Command handler for /autoreply
app.command("/autoreply", async ({ command, ack, say }) => {
  await ack();
  const userId = command.user_id;
  const text = command.text.trim().toLowerCase();

  if (text === "on") {
    userSettings[userId] = true;
    await say(`✅ Auto-reply is now ON for you, <@${userId}>.`);
  } else if (text === "off") {
    userSettings[userId] = false;
    await say(`🛑 Auto-reply is now OFF for you, <@${userId}>.`);
  } else {
    await say(`⚙️ Use "/autoreply on" or "/autoreply off" to toggle auto replies.`);
  }
});

// ✅ Listen for direct messages and auto-reply
app.event("message", async ({ event, client }) => {
  if (!event.user || event.subtype === "bot_message") return;

  const userId = event.user;
  if (userSettings[userId]) {
    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: `🤖 I'm currently away, but I’ll get back to you soon!`,
      });
    } catch (error) {
      console.error("Error sending auto-reply:", error);
    }
  }
});

// ✅ Start express server manually on port 3000
const expressApp = express();
expressApp.use("/slack/events", receiver.router);

const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`🚀 AutoReply bot is running on port ${PORT}`);
});
