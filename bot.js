require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");
const { GoogleGenerativeAI } = require("@google/generative-ai");

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// delay helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let aiBusy = false;
let aiActive = true; // AI aktif default
let errorNotified = false; // flag supaya error cuma kirim 1 kali

async function askAI(model, text) {
  while (aiBusy) {
    await sleep(2000);
  }

  aiBusy = true;

  try {
    await sleep(12000); // anti rate limit (5 request / menit)
    const result = await model.generateContent(text);
    return result.response.text();
  } catch (err) {
    console.error("AI Error:", err);
    return null; // kembalikan null supaya bisa deteksi error
  } finally {
    aiBusy = false;
  }
}

async function startBot() {
  console.log("🚀 Starting WhatsApp AI bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["AI Bot", "Chrome", "1.0"],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 Scan QR code:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected!");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Connection closed:", reason);

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        setTimeout(startBot, 5000);
      } else {
        console.log("🚪 Logged out. Delete auth_info folder.");
      }
    }
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!text) return;

      // hanya tangani chat pribadi, bukan grup
      if (from.endsWith("@g.us")) return;
      if (from === "status@broadcast") return;

      // cek command /on dan /off
      const isCommand = ["/on", "/off"].includes(text.toLowerCase());

      if (isCommand) {
        if (text.toLowerCase() === "/off") {
          aiActive = false;
          errorNotified = false;
          console.log("⚠️ AI dimatikan oleh user.");
        } else if (text.toLowerCase() === "/on") {
          aiActive = true;
          errorNotified = false;
          console.log("✅ AI diaktifkan oleh user.");
        }

        // selalu kirim balasan command
        await sock.sendMessage(from, {
          text:
            text.toLowerCase() === "/on"
              ? "🤖 AI diaktifkan. Sekarang siap membalas pesan."
              : "🤖 AI dimatikan. Ketik /on untuk menghidupkan kembali.",
        });
        return;
      }

      // Jika AI nonaktif, jangan membalas pesan
      if (!aiActive) return;

      // Anti-loop: jangan balas pesan dari bot sendiri
      if (fromMe) return;

      console.log(`📩 ${from}: ${text}`);
      await sock.sendPresenceUpdate("composing", from);

      const prompt = `
Kamu adalah asisten AI yang sangat membantu.

Jawablah semua pesan **dalam bahasa Indonesia** dengan sopan dan jelas.

Pesan pengguna :
${text}
`;

      const reply = await askAI(model, prompt);

      if (reply === null) {
        // hanya kirim pesan error 1 kali
        if (!errorNotified) {
          await sock.sendMessage(from, {
            text: "⚠️ Maaf, AI sedang mengalami gangguan.",
          });
          errorNotified = true;
        }
        return;
      }

      console.log("🤖 AI:", reply);
      await sock.sendMessage(from, { text: reply });
    } catch (err) {
      console.error("⚠️ Error saat memproses pesan:", err);
    }
  });
}

startBot();
