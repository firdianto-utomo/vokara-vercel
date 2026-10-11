# Vokara Website

Landing page Vokara: Node.js + Express. Halamannya ada di `public/index.html`.

## Menjalankan di komputer sendiri
```bash
npm install
npm start          # buka http://localhost:3000
```

## Mengedit konten
Buka `public/index.html`, lalu cari bagian `const CONFIG = {` di bagian bawah file. Di sana Anda bisa mengubah:
- nomor WhatsApp, pesan otomatis WhatsApp, dan email
- link media sosial (isi URL-nya, maka link otomatis muncul di footer)
- item portofolio (isi `video` dengan ID video YouTube)
- testimoni (ubah `showTestimonials: true` jika sudah ada testimoni asli)

## Environment variables (diatur di Hostinger)
| Nama | Isi |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | utomofirdianto@gmail.com |
| `SMTP_PASS` | App Password Gmail, yaitu 16 karakter tanpa spasi |
| `MAIL_TO` | utomofirdianto@gmail.com |

App Password Gmail dibuat lewat Google Account → Security → aktifkan 2-Step Verification → App passwords.
**Jangan pernah menulis password ini di dalam kode atau meng-upload-nya ke GitHub.**
