# Backend — HLS Video Streaming Server

Overview
- Small Express server that accepts video uploads, converts them to HLS using FFmpeg and serves the generated `.m3u8` playlist and `.ts` segments from `public/videos/<chapterId>/`.

Prerequisites
- Node.js and npm
- FFmpeg available on PATH

Install

```bash
cd backend
npm install
```

Run

```bash
# start server (default port 3000)
node index.js
```

How it works
- Uploads: POST `/upload` accepts `multipart/form-data` with field `video` (file) and optional `title`.
- Conversion: server runs FFmpeg to produce an HLS VOD playlist with 6s segments; output is written to `public/videos/<chapterId>/index.m3u8`.
- Sample file: if `uploads/sample.mp4` exists on startup the server will automatically convert it and register a chapter.

API endpoints
- `POST /upload` — upload video(s) with optional title; returns `{ message, videoId, masterPlaylistUrl, variants }`.
- `GET /getVideo` — returns sample adaptive video metadata (hardcoded URLs for demo).
- `GET /getLatestVideo` — returns the most recently uploaded video `{ title, url }` (master playlist).
- `GET /health` — server health check.
- `GET /public/...` — static serving of HLS files (playlists and segments).

Upload example (curl)

```bash
curl -F "video=@/path/to/video.mp4" -F "title=My Video" http://localhost:3000/upload
```

Notes
- Ensure `ffmpeg` is installed and accessible from the user running the server.
- Default server port is `3000` (set in `index.js`). If you change it, update the frontend accordingly.
- The upload middleware is implemented in `upload/upload.js` and static HLS output lives under `public/videos/`.

Directory (important files)
- `index.js` — server and endpoints
- `upload/upload.js` — multer middleware for handling file uploads
- `public/videos/` — generated HLS playlists and segments
- `uploads/` — temporary uploads and sample files
