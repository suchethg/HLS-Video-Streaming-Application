 # Frontend — Video Binge Watch (React)

 Overview
 - React app that displays the latest HLS video served by the backend. The app uses `axios` to fetch metadata and `video.js` to play HLS streams (`.m3u8`).

 Prerequisites
 - Node.js and npm
 - Backend server running and accessible (default backend: http://localhost:3000)

 Install

 ```bash
 cd frontend/video-binge-watch
 npm install
 ```

 Run

 ```bash
 # If you need to avoid port conflicts set a different port, e.g. 3001
 export PORT=3001
 npm start
 ```

 How it works
 - On mount, `src/App.js` requests `GET http://localhost:3000/getLatestVideo` and receives `{ title, url }`.
 - `VideoPlayer.jsx` (uses `video.js`) receives the `url` prop and initializes a `video.js` player with source type `application/x-mpegURL`.
 - The player renders the HLS master playlist which provides adaptive bitrate streaming (720p/4K variants if uploaded with multiple qualities).

 Important files
 - `src/App.js` — fetches latest video metadata and passes `url` to the player.
 - `src/VideoPlayer.jsx` — initializes `video.js` with the HLS `.m3u8` URL.

 Notes
 - Start the backend before the frontend so the app can fetch the latest video metadata.
 - If you change the backend port, update the request URL in `src/App.js`.
 - The player expects a valid HLS playlist URL (the backend serves these under `/public/videos/<chapterId>/index.m3u8`).

