const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");

async function jalankanBot() {
  // 1. Menyimpan sesi login agar tidak perlu scan QR terus-menerus
  const { state, saveCreds } = await useMultiFileAuthState("sesi_bot_wa");

  // 2. Menginisialisasi koneksi ke WhatsApp
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }), // Menyembunyikan log eror bawaan
    printQRInTerminal: false,
  });

  // 3. Menampilkan QR Code di terminal saat pertama kali dijalankan
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("=== SCAN QR CODE INI DENGAN WHATSAPP ANDA ===");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const harusKonekUlang = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Koneksi terputus. Mencoba menghubungkan kembali...", harusKonekUlang);
      if (harusKonekUlang) {
        jalankanBot();
      }
    } else if (connection === "open") {
      console.log("Selamat! Bot WhatsApp Anda berhasil terhubung dan aktif.");
    }
  });

  // 4. Menyimpan data kredensial saat berhasil login
  sock.ev.on("creds.update", saveCreds);

  // 5. Membaca pesan masuk (Aktif di Grup & Private Chat / PC)
  sock.ev.on("messages.upsert", async (m) => {
    const pesan = m.messages[0];
    if (!pesan.message || pesan.key.fromMe) return;

    const idPengirim = pesan.key.remoteJid;
    const teksMasuk = pesan.message.conversation || pesan.message.extendedTextMessage?.text || "";

    const kataKunci = teksMasuk.toLowerCase();

    // CONTOH 1: Respons Promosi
    if (kataKunci.includes("!produk") || kataKunci.includes("info jualan") || kataKunci.includes("vpn") || kataKunci.includes("halo")) {
      const teksPromosi = `Butuh jalur lain? 👀

      Kenalin, Kr!nk. layanan VPN untuk kamu yang ingin koneksi melalui lokasi VPN yang berbeda dengan proses yang simpel.
      Another route. Your way.

      🌐 Pilih lokasi VPN
      ⚡ Aktivasi mudah
      💬 Support tersedia

      Kr!nk your connection!
    \n_Pesan otomatis oleh Bot Toko_`;

      await sock.sendMessage(idPengirim, { text: teksPromosi }, { quoted: pesan });
      console.log(`[BOT] Berhasil mengirim promosi ke: ${idPengirim}`);
    }

    // CONTOH 2: Respons Pricelist
    else if (kataKunci.includes("harga") || kataKunci.includes("pricelist") || kataKunci.includes("berapa")) {
      const teksPricelist = `*DAFTAR HARGA VPN PREMIUM* 

    Silakan pilih paket sesuai kebutuhanmu ya kak:

    1. *VPN IDN* 
      - 1 bulan = 25rb 
      - 1 minggu = 15rb 
      - 1 hari = 7rb 

    2. *VPN SG* 
      - 1 bulan = 25rb 
      - 1 minggu = 15rb 
      - 1 hari = 7rb 

    *Format Order:*
    Ketik *Order [Nama Paket]* untuk langsung memesan.

    Mau ambil paket yang mana nih? 😊
    Cara payment kami ada:
    - PayPal 
    - QRIS
    - E-wallet lainnya`;

      await sock.sendMessage(idPengirim, { text: teksPricelist }, { quoted: pesan });
      console.log(`[BOT] Berhasil mengirim pricelist ke: ${idPengirim}`);
    }
  });
}

// Menjalankan fungsi utama bot
jalankanBot();
