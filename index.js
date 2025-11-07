require('dotenv').config();
const { App } = require('@slack/bolt');
const fs = require('fs-extra');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const STATE_FILE = './state.json';

// Load or create state
function loadState() {
  if (!fs.existsSync(STATE_FILE)) fs.writeJsonSync(STATE_FILE, {});
  return fs.readJsonSync(STATE_FILE);
}

function saveState(state) {
  fs.writeJsonSync(STATE_FILE, state, { spaces: 2 });
}

function isEnabled(userId) {
  const state = loadState();
  return state[userId]?.enabled === true;
}

function setEnabled(userId, value) {
  const state = loadState();
  if (!state[userId]) state[userId] = { enabled: false, message: '' };
  state[userId].enabled = value;
  saveState(state);
}

function setMessage(userId, message) {
  const state = loadState();
  if (!state[userId]) state[userId] = { enabled: false, message: '' };
  state[userId].message = message;
  saveState(state);
}

function getMessage(userId) {
  const state = loadState();
  return state[userId]?.message || '';
}

// Slash command to toggle or edit message
app.command('/autoreply', async ({ command, ack, say }) => {
  await ack();
  const userId = command.user_id;
  const args = command.text.trim();

  if (args.toLowerCase() === 'on') {
    setEnabled(userId, true);
    await say('✅ Auto-reply is now ON for you');
  } else if (args.toLowerCase() === 'off') {
    setEnabled(userId, false);
    await say('❌ Auto-reply is now OFF for you');
  } else if (args.toLowerCase().startsWith('set ')) {
    const newMessage = args.slice(4).trim();
    setMessage(userId, newMessage);
    await say('✏️ Your auto-reply message has been updated');
  } else {
    await say('Usage:\n`/autoreply on` → turn on\n`/autoreply off` → turn off\n`/autoreply set [your message]` → set custom message');
  }
});

// Listen to DMs
app.message(async ({ message, say }) => {
  if (!message.user || message.bot_id) return; // ignore bots
  if (message.channel_type === 'im' && isEnabled(message.user)) {
    await say(getMessage(message.user));
  }
});

// Start app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡ Slack DM auto-reply bot running on port ${port}`);
})();
