# HLS-Video-Streaming-Application

Backend:
    i. Accept a video upload
    ii. Convert it to HLS (.m3u8 + .ts segments) using FFmpeg
    iii. Serve those files over HTTP

Frontend:
    i. Load an HLS URL
    ii. Play it using a video player (Video.js)

Glue:
    i. Backend returns a video URL
    ii. Frontend uses that URL

