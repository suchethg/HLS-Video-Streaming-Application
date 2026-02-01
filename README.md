# HLS Video Streaming Application

This project is a simple HLS (HTTP Live Streaming) video streaming application with a backend for video processing and a frontend for playback.

## Backend

The backend handles video uploads, converts them to HLS format, and serves the resulting files.

- **Upload Video**: Accept video file uploads from users.
- **Convert to HLS**: Use **FFmpeg** to convert uploaded videos into HLS format (`.m3u8` playlist + `.ts` segments).
- **Serve Files**: Serve the `.m3u8` and `.ts` files over HTTP for streaming.

## Frontend

The frontend loads HLS URLs and plays the videos in the browser.

- **Load HLS URL**: Accepts a video URL provided by the backend.
- **Play Video**: Uses **Video.js** to play HLS streams smoothly in the browser.

## Integration (Glue)

The backend and frontend are connected as follows:

- The backend returns a video URL (HLS playlist `.m3u8`) after conversion.
- The frontend uses that URL in the video player to stream the video.

## Tech Stack

- **Backend**: Node.js 
- **Video Processing**: FFmpeg  
- **Frontend**: React / HTML + Video.js  
- **Streaming**: HTTP server to serve HLS files
