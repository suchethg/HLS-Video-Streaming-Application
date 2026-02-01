const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const upload = require('./upload/upload');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const publicVideosDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(publicVideosDir)) fs.mkdirSync(publicVideosDir, { recursive: true });

let latestVideo = { title: 'Sample Video', url: null, variants: [] };

// Function to convert videos from uploads/ directory on startup
async function initializeVideos() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found');
    return;
  }

  try {
    const files = fs.readdirSync(uploadsDir).filter(f => /\.(mp4|mov|avi|mkv)$/i.test(f));
    if (files.length === 0) {
      console.log('No video files found in uploads/');
      return;
    }

    console.log(`Found ${files.length} video(s) in uploads/, converting...`);
    const videoId = uuidv4();
    const outputDir = path.join(publicVideosDir, videoId);
    fs.mkdirSync(outputDir, { recursive: true });

    const variants = [];

    for (const file of files) {
      const inputPath = path.join(uploadsDir, file);
      const quality = file.includes('720') ? '720p' : '4K';
      const qualityDir = path.join(outputDir, quality);
      fs.mkdirSync(qualityDir, { recursive: true });

      const outputM3U8 = path.join(qualityDir, 'index.m3u8');

      const ffmpegCmd = `ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -hls_time 6 -hls_playlist_type vod "${outputM3U8}"`;

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (err, stdout, stderr) => {
          if (err) {
            console.error(`FFmpeg error converting ${file}:`, stderr);
            return reject(err);
          }
          console.log(`✓ ${file} converted to HLS successfully`);
          variants.push({ label: quality, url: `/public/videos/${videoId}/${quality}/index.m3u8` });
          resolve();
        });
      });
    }

    const masterPlaylist = path.join(outputDir, 'master.m3u8');
    const masterContent = variants
      .map(v => `#EXT-X-STREAM-INF:BANDWIDTH=${v.label === '720p' ? 2000000 : 8000000},RESOLUTION=${v.label === '720p' ? '1280x720' : '3840x2160'}
${v.url}`)
      .join('\n');

    fs.writeFileSync(masterPlaylist, masterContent);

    latestVideo = {
      title: 'Default Video from uploads',
      url: `http://localhost:${PORT}/public/videos/${videoId}/master.m3u8`,
      variants: variants.map(v => ({
        label: v.label,
        url: `http://localhost:${PORT}${v.url}`
      }))
    };

    console.log(`✓ Videos initialized and ready at ${latestVideo.url}`);
  } catch (err) {
    console.error('Error initializing videos:', err);
  }
}

// Initialize videos on startup
initializeVideos();

// Upload endpoint
app.post('/upload', upload.array('videos', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No videos uploaded' });
    }

    const videoId = uuidv4();
    const outputDir = path.join(publicVideosDir, videoId);
    fs.mkdirSync(outputDir, { recursive: true });

    const variants = [];

    for (const file of req.files) {
      const quality = file.originalname.includes('720') ? '720p' : '4K';
      const qualityDir = path.join(outputDir, quality);
      fs.mkdirSync(qualityDir, { recursive: true });

      const outputM3U8 = path.join(qualityDir, 'index.m3u8');

      const ffmpegCmd = `ffmpeg -i "${file.path}" -c:v libx264 -c:a aac -hls_time 6 -hls_playlist_type vod "${outputM3U8}"`;

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (err, stdout, stderr) => {
          if (err) {
            console.error(`FFmpeg error converting ${file.originalname}:`, stderr);
            return reject(err);
          }
          console.log(`${file.originalname} converted to HLS successfully`);
          variants.push({ label: quality, url: `/public/videos/${videoId}/${quality}/index.m3u8` });
          resolve();
        });
      });
    }

    const masterPlaylist = path.join(outputDir, 'master.m3u8');
    const masterContent = variants
      .map(v => `#EXT-X-STREAM-INF:BANDWIDTH=${v.label === '720p' ? 2000000 : 8000000},RESOLUTION=${v.label === '720p' ? '1280x720' : '3840x2160'}
${v.url}`)
      .join('\n');

    fs.writeFileSync(masterPlaylist, masterContent);

    // Update latest video
    const title = req.body.title || `Video ${new Date().toISOString()}`;
    latestVideo = {
      title,
      url: `http://localhost:${PORT}/public/videos/${videoId}/master.m3u8`,
    };

    res.json({
      message: 'Videos uploaded and converted to adaptive HLS successfully',
      videoId,
      masterPlaylistUrl: `http://localhost:${PORT}/public/videos/${videoId}/master.m3u8`,
      variants,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to get latest video
app.get('/getLatestVideo', (req, res) => {
  if (!latestVideo.url) {
    return res.status(404).json({ error: 'No videos uploaded yet' });
  }
  res.json({
    title: latestVideo.title,
    url: latestVideo.url,
    variants: latestVideo.variants
  });
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
