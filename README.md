# WhatsApp AI Bot (Bahasa Indonesia)

Bot WhatsApp berbasis AI yang membalas chat pribadi secara otomatis menggunakan **Google Gemini AI**, khusus dalam **bahasa Indonesia**. Bot ini mendukung perintah `/on` dan `/off` untuk menghidupkan atau mematikan balasan AI.

---

## Fitur

- Membalas chat pribadi otomatis dengan AI (tidak untuk grup)
- Balasan selalu dalam **bahasa Indonesia**
- Perintah `/on` → menghidupkan bot
- Perintah `/off` → mematikan bot
- Anti-loop: bot tidak membalas pesan sendiri
- Hanya mengirim pesan error **1 kali** jika AI gagal

---

## Instalasi

1. Clone repository:

```bash
git clone https://github.com/USERNAME/whatsapp-ai-bot-id.git
cd whatsapp-ai-bot-id

Install dependencies:

npm install

Buat file .env dengan isi:

GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
Menjalankan Bot
node bot.js

Scan QR code yang muncul di terminal.

Bot otomatis siap membalas chat pribadi.

Gunakan /off untuk mematikan bot dan /on untuk menghidupkan kembali.

Catatan

Bot hanya membalas chat pribadi, bukan grup.

Jika terjadi error AI, bot akan mengirim pesan satu kali dan tidak akan spam.

Jangan bagikan API key Anda ke publik.

License

MIT License
```
