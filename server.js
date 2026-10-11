/* =============================================================
   VOKARA — server.js
   Simple Express server:
   1. Serves the website from the /public folder
   2. Receives form submissions at POST /api/inquiry
      and emails them to you via Gmail SMTP (nodemailer)

   All secrets live in environment variables (set them in Hostinger):
     SMTP_HOST   default: smtp.gmail.com
     SMTP_PORT   default: 465
     SMTP_USER   your Gmail address (the sender account)
     SMTP_PASS   your Gmail APP PASSWORD (not your normal password)
     MAIL_TO     where inquiries are delivered (e.g. utomofirdianto@gmail.com)
   ============================================================= */

const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000; // Hostinger provides PORT automatically

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

// ---------- Static website ----------
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1h",
    extensions: ["html"],
  })
);

// ---------- Email transporter ----------
const mailReady = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = mailReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

if (!mailReady) {
  console.warn("[vokara] SMTP_USER / SMTP_PASS not set — form emails are disabled.");
}

// ---------- Simple in-memory rate limit (5 submissions / 15 min per IP) ----------
const hits = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_HITS = 5;
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_HITS;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    if (!list.some((t) => now - t < WINDOW_MS)) hits.delete(ip);
  }
}, WINDOW_MS).unref();

// ---------- Helpers ----------
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Form endpoint ----------
// type "quote"    → project inquiry form
// type "waitlist" → AI stock footage launch notification
app.post("/api/inquiry", async (req, res) => {
  const body = req.body || {};

  // Honeypot: real visitors never fill the hidden "website" field
  if (body.website) return res.json({ ok: true });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Too many requests. Please try again later or contact us on WhatsApp." });
  }

  const type = body.type === "waitlist" ? "waitlist" : "quote";
  const data = {
    name: clean(body.name, 100),
    company: clean(body.company, 120),
    email: clean(body.email, 150),
    whatsapp: clean(body.whatsapp, 30),
    service: clean(body.service, 80),
    message: clean(body.message, 2000),
  };

  // Validation
  if (!isEmail(data.email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (type === "quote" && (!data.name || !data.service || data.message.length < 10)) {
    return res.status(400).json({ ok: false, error: "Please fill in your name, service, and a short project description." });
  }

  if (!transporter) {
    return res.status(503).json({ ok: false, error: "Email is not configured yet. Please contact us on WhatsApp." });
  }

  const subject =
    type === "quote"
      ? `New quote request — ${data.service} — ${data.company || data.name}`
      : `New AI stock footage waitlist signup — ${data.email}`;

  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#555;text-transform:capitalize">${k}</td><td style="padding:6px 12px"><b>${escapeHtml(v).replace(/\n/g, "<br>")}</b></td></tr>`)
    .join("");

  try {
    await transporter.sendMail({
      from: `"Vokara Website" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO || process.env.SMTP_USER,
      replyTo: data.email,
      subject,
      text: Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<div style="font-family:Arial,sans-serif"><h2 style="color:#0B1F3A">${escapeHtml(subject)}</h2><table>${rows}</table></div>`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[vokara] Email error:", err.message);
    res.status(500).json({ ok: false, error: "We couldn't send your message. Please contact us on WhatsApp." });
  }
});

// ---------- Landing page for every other GET request ----------
// The page is read once into memory, so it works both on Hostinger
// and on Vercel (where express.static is ignored). Never redirects.
let indexHtml = null;
try {
  indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
} catch (err) {
  console.error("[vokara] Could not read public/index.html:", err.message);
}
app.get("*", (req, res) => {
  if (!indexHtml) return res.status(500).type("text").send("Website file not found (public/index.html).");
  res.type("html").send(indexHtml);
});

// ---------- Start ----------
// Hostinger / local: "node server.js" starts the server on a port.
// Vercel: imports this file and uses the exported app (no port needed).
if (require.main === module) {
  app.listen(PORT, () => console.log(`[vokara] Running on port ${PORT}`));
}

module.exports = app;
