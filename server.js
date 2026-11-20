require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
// Railway/Render terminate TLS at their proxy and forward HTTP to the app.
// Without this, Express thinks the request is plain HTTP and refuses to
// set the secure session cookie, so admin login never sticks.
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const POSTER_DIR = path.join(UPLOAD_DIR, "posters");
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");
for (const dir of [DATA_DIR, UPLOAD_DIR, POSTER_DIR, VIDEO_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, "cinewave.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'অন্যান্য',
    release_year INTEGER,
    duration TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    video TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const adminName = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
const existingAdmin = db.prepare("SELECT id FROM admins WHERE username = ?").get(adminName);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(adminName, hash);
  console.log(`Initial admin created. Username: ${adminName}`);
  if (!process.env.ADMIN_PASSWORD) console.warn("IMPORTANT: Set ADMIN_PASSWORD in .env before deployment.");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn("WARNING: Set a random SESSION_SECRET of at least 32 characters in .env.");
}
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret-please",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
const allowedPoster = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedVideo = new Set(["video/mp4", "video/webm", "video/ogg", "application/octet-stream"]);
const maxBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 1500)) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === "poster" ? POSTER_DIR : VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: maxBytes, files: 2 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "poster" && allowedPoster.has(file.mimetype)) return cb(null, true);
    if (file.fieldname === "video" && allowedVideo.has(file.mimetype)) return cb(null, true);
    cb(new Error("এই ফাইলের ধরন অনুমোদিত নয়। JPG/PNG/WebP পোস্টার এবং MP4/WebM/OGG ভিডিও ব্যবহার করুন।"));
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ error: "প্রথমে অ্যাডমিন হিসেবে লগইন করুন।" });
}
function safeDelete(relativePath) {
  if (!relativePath) return;
  const full = path.resolve(ROOT, relativePath.replace(/^\/+/, ""));
  if (full.startsWith(path.resolve(UPLOAD_DIR) + path.sep) && fs.existsSync(full)) {
    try { fs.unlinkSync(full); } catch (e) { console.error("File cleanup failed:", e.message); }
  }
}

app.use("/uploads", express.static(UPLOAD_DIR, {
  setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); }
}));
app.use(express.static(path.join(ROOT, "public")));

app.get("/api/movies", (req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  let sql = "SELECT id,title,description,category,release_year,duration,poster,created_at FROM movies WHERE 1=1";
  const params = [];
  if (q) { sql += " AND (title LIKE ? OR description LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (category) { sql += " AND category = ?"; params.push(category); }
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/movies/:id", (req, res) => {
  const movie = db.prepare("SELECT id,title,description,category,release_year,duration,poster,video,created_at FROM movies WHERE id = ?").get(Number(req.params.id));
  if (!movie) return res.status(404).json({ error: "মুভি পাওয়া যায়নি।" });
  res.json(movie);
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(String(username || ""));
  if (!admin || !bcrypt.compareSync(String(password || ""), admin.password_hash)) {
    return res.status(401).json({ error: "ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।" });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "লগইন করা যায়নি।" });
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    res.json({ ok: true, username: admin.username });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (!req.session.adminId) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: req.session.adminUsername });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS n FROM movies").get().n;
  const categories = db.prepare("SELECT COUNT(DISTINCT category) AS n FROM movies").get().n;
  res.json({ total, categories });
});

app.post("/api/admin/movies", requireAdmin, upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]), (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "মুভির নাম দিতে হবে।" });
  const videoFile = req.files?.video?.[0];
  const posterFile = req.files?.poster?.[0];
  const poster = posterFile ? `/uploads/posters/${posterFile.filename}` : "";
  // Video is optional at creation: a poster-only card can be added now
  // and the video uploaded later via Edit. Empty string, never NULL.
  const video = videoFile ? `/uploads/videos/${videoFile.filename}` : "";
  const result = db.prepare(`
    INSERT INTO movies (title,description,category,release_year,duration,poster,video)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    title,
    String(req.body.description || "").trim(),
    String(req.body.category || "অন্যান্য").trim().slice(0, 60),
    Number(req.body.release_year) || null,
    String(req.body.duration || "").trim().slice(0, 30),
    poster,
    video
  );
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.put("/api/admin/movies/:id", requireAdmin, upload.fields([{ name: "poster", maxCount: 1 }, { name: "video", maxCount: 1 }]), (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare("SELECT * FROM movies WHERE id = ?").get(id);
  if (!old) return res.status(404).json({ error: "মুভি পাওয়া যায়নি।" });
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "মুভির নাম দিতে হবে।" });
  const posterFile = req.files?.poster?.[0];
  const videoFile = req.files?.video?.[0];
  const poster = posterFile ? `/uploads/posters/${posterFile.filename}` : old.poster;
  const video = videoFile ? `/uploads/videos/${videoFile.filename}` : old.video;
  db.prepare(`
    UPDATE movies SET title=?,description=?,category=?,release_year=?,duration=?,poster=?,video=? WHERE id=?
  `).run(
    title,
    String(req.body.description || "").trim(),
    String(req.body.category || "অন্যান্য").trim().slice(0, 60),
    Number(req.body.release_year) || null,
    String(req.body.duration || "").trim().slice(0, 30),
    poster, video, id
  );
  if (posterFile) safeDelete(old.poster);
  if (videoFile) safeDelete(old.video);
  res.json({ ok: true });
});

app.delete("/api/admin/movies/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const movie = db.prepare("SELECT poster,video FROM movies WHERE id = ?").get(id);
  if (!movie) return res.status(404).json({ error: "মুভি পাওয়া যায়নি।" });
  db.prepare("DELETE FROM movies WHERE id = ?").run(id);
  safeDelete(movie.poster);
  safeDelete(movie.video);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  const message = err instanceof multer.MulterError
    ? (err.code === "LIMIT_FILE_SIZE" ? "ফাইলের আকার নির্ধারিত সীমার চেয়ে বড়।" : "ফাইল আপলোডে সমস্যা হয়েছে।")
    : (err.message || "সার্ভারে সমস্যা হয়েছে।");
  res.status(400).json({ error: message });
});

app.listen(PORT, () => console.log(`CineWave is running at http://localhost:${PORT}`));
