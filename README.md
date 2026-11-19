# CineWave — Movie Streaming Website

A responsive Bengali movie-library/streaming starter with a public catalog and a protected admin panel.

## Features
- Dark cinematic responsive interface
- Movie catalog, search, category filter, detail modal and HTML5 video player
- Admin login with bcrypt password hashing and session authentication
- Upload movie poster and video; edit/delete movie records
- SQLite database and SQLite-backed session storage
- Basic upload MIME checks, upload size limit, login rate limiting and security headers

## Requirements
- Node.js 20 or newer
- Enough disk space and bandwidth for your video files

## Run locally
1. Extract the ZIP.
2. Open a terminal in the project folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Change `SESSION_SECRET` to a random string of at least 32 characters and set a strong `ADMIN_PASSWORD`.
6. Start:
   ```bash
   npm start
   ```
7. Visit `http://localhost:3000`.
8. Admin panel: `http://localhost:3000/admin.html`.

Default username is `admin` unless changed in `.env`. Set your own password before first launch. The initial admin account is created on first start; changing the environment password later does not automatically reset an existing admin password.

## Upload notes
- Video types: MP4, WebM, OGG.
- Poster types: JPG, PNG, WebP, AVIF.
- Default upload limit is 1500 MB; adjust `MAX_UPLOAD_MB` in `.env`.
- Files are stored in `uploads/`; database and session files are stored in `data/`.
- Back up both `data/` and `uploads/`.

## Production deployment checklist
- Use HTTPS and set `NODE_ENV=production`.
- Use a long, unique `SESSION_SECRET` and strong admin password.
- Configure your reverse proxy/web server to allow the desired request body size and long upload timeouts.
- Put uploads on persistent storage. Do not deploy to ephemeral hosting unless you configure persistent volumes/object storage.
- For large audiences, use object storage + CDN and a streaming format such as HLS; this starter serves uploaded files directly and is intended as a simple MVP.
- Add CSRF protection, audit logs, admin password-change flow, backups, malware scanning and stricter content validation before public production use.
- Only upload and distribute content you own or are authorized to publish.

## Important
This is a runnable starter project, not a fully audited commercial streaming platform. Do not expose the admin panel with the example credentials. Review security and hosting limits before public launch.

## Live deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Ubuntu VPS + Docker + Nginx + HTTPS deployment walkthrough.
