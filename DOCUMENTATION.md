# HLS Video Streaming Application - Complete Documentation

## Overview

This is a full-stack HLS (HTTP Live Streaming) video streaming application that allows users to watch videos in adaptive bitrate quality (720p and 4K). The application automatically converts uploaded videos to HLS format and provides a React-based player with quality selection.

## Architecture

### System Components

```
┌─────────────────────────────────────────────┐
│         React Frontend (Port 3001)          │
│  - Video Player UI                          │
│  - Quality Selector (Auto/720p/4K)          │
│  - Real-time Quality Detection              │
└──────────────────┬──────────────────────────┘
                   │ HTTP Requests
                   │
┌──────────────────▼──────────────────────────┐
│      Express Backend (Port 3000)            │
│  - HLS Conversion (FFmpeg)                  │
│  - File Management                          │
│  - API Endpoints                            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│    File System & Video Storage              │
│  - uploads/ (source videos)                 │
│  - public/videos/ (HLS output)              │
└─────────────────────────────────────────────┘
```

---

## Backend Architecture

### Technology Stack
- **Framework**: Express.js
- **Video Conversion**: FFmpeg
- **File Upload**: Multer
- **Video IDs**: UUID v4

### File Structure
```
backend/
├── index.js              # Main server & API endpoints
├── upload/
│   └── upload.js        # Multer configuration for file uploads
├── public/
│   └── videos/          # HLS output files (generated)
│       └── {videoId}/
│           ├── master.m3u8       # Master playlist
│           ├── 720p/
│           │   ├── index.m3u8    # 720p playlist
│           │   ├── index0.ts     # 720p segment 1
│           │   └── index1.ts     # 720p segment 2
│           └── 4K/
│               ├── index.m3u8    # 4K playlist
│               ├── index0.ts     # 4K segment 1
│               └── index1.ts     # 4K segment 2
├── uploads/             # Source videos
│   ├── 720.mp4         # 720p source
│   └── 4k.mp4          # 4K source
└── package.json
```

### How Backend Works

#### 1. **Server Initialization** (`index.js`)

```javascript
// On startup:
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  initializeVideos(); // Auto-convert videos from uploads/
});
```

#### 2. **Video Initialization** (`initializeVideos()`)

When the server starts, it:

```javascript
async function initializeVideos() {
  // 1. Read all videos from uploads/ directory
  const files = fs.readdirSync(uploadsDir)
    .filter(f => /\.(mp4|mov|avi|mkv)$/i.test(f));
  
  // 2. Generate unique video ID
  const videoId = uuidv4();
  
  // 3. For each video file:
  for (const file of files) {
    const quality = file.includes('720') ? '720p' : '4K';
    
    // 4. Create output directory for that quality
    const qualityDir = path.join(outputDir, quality);
    
    // 5. Run FFmpeg command to convert to HLS
    const ffmpegCmd = `ffmpeg -i "${inputPath}" 
      -c:v libx264          # H.264 video codec
      -c:a aac              # AAC audio codec
      -hls_time 6           # 6 second segments
      -hls_playlist_type vod # Video on Demand playlist
      "${outputM3U8}"`;
  }
  
  // 6. Create master playlist linking all qualities
  const masterContent = variants.map(v => 
    `#EXT-X-STREAM-INF:BANDWIDTH=...,RESOLUTION=...
${v.url}`
  ).join('\n');
  
  // 7. Store latest video metadata
  latestVideo = {
    title: 'Default Video from uploads',
    url: 'http://localhost:3000/public/videos/{videoId}/master.m3u8',
    variants: [{label: '720p', url: ...}, {label: '4K', url: ...}]
  };
}
```

#### 3. **HLS Output Explanation**

HLS converts a single video into:

- **Master Playlist** (`master.m3u8`): Lists all available qualities
  ```
  #EXTM3U
  #EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
  /public/videos/{id}/720p/index.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=3840x2160
  /public/videos/{id}/4K/index.m3u8
  ```

- **Quality Playlists** (`720p/index.m3u8`, `4K/index.m3u8`): List video segments
  ```
  #EXTM3U
  #EXT-X-TARGETDURATION:6
  #EXTINF:6.0,
  index0.ts
  #EXTINF:6.0,
  index1.ts
  ```

- **Video Segments** (`index0.ts`, `index1.ts`): Actual video chunks (6 seconds each)

#### 4. **API Endpoints**

##### `GET /getLatestVideo`
Returns the most recently converted/uploaded video:
```javascript
app.get('/getLatestVideo', (req, res) => {
  if (!latestVideo.url) {
    return res.status(404).json({ error: 'No videos uploaded yet' });
  }
  res.json({
    title: latestVideo.title,
    url: latestVideo.url,          // Master playlist URL
    variants: [                     // Individual quality URLs
      { label: '720p', url: '...' },
      { label: '4K', url: '...' }
    ]
  });
});
```

**Response Example**:
```json
{
  "title": "Default Video from uploads",
  "url": "http://localhost:3000/public/videos/87ebc924.../master.m3u8",
  "variants": [
    {
      "label": "720p",
      "url": "http://localhost:3000/public/videos/87ebc924.../720p/index.m3u8"
    },
    {
      "label": "4K",
      "url": "http://localhost:3000/public/videos/87ebc924.../4K/index.m3u8"
    }
  ]
}
```

##### `GET /public/...`
Serves static HLS files:
```javascript
app.use('/public', express.static(path.join(__dirname, 'public')));
```

---

## Frontend Architecture

### Technology Stack
- **Framework**: React with Hooks
- **Video Player**: video.js
- **HTTP Client**: Axios
- **Development**: Create React App

### File Structure
```
frontend/video-binge-watch/src/
├── App.js             # Main app component & quality selection logic
├── VideoPlayer.jsx    # Video.js player wrapper
├── App.css
├── index.js
└── index.css
```

### How Frontend Works

#### 1. **App.js - Main Application Logic**

```javascript
function App() {
  // State management
  const [videoVariants, setVideoVariants] = useState([]);      // [720p, 4K]
  const [masterUrl, setMasterUrl] = useState(null);            // Master playlist URL
  const [selectedVideo, setSelectedVideo] = useState(null);    // Currently selected
  const [detectedQuality, setDetectedQuality] = useState(null);// Auto-detected quality

  // On mount: Fetch video metadata from backend
  useEffect(() => {
    axios.get("http://localhost:3000/getLatestVideo")
      .then(res => {
        setVideoVariants(res.data.variants);      // Store 720p/4K URLs
        setMasterUrl(res.data.url);               // Store master URL
        
        // Default to Auto (Master)
        setSelectedVideo({ 
          label: 'Auto (Master)', 
          url: res.data.url 
        });
      })
      .catch(err => console.error("Error:", err));
  }, []);

  return (
    <div>
      <h2>HLS Video Player</h2>
      
      {/* Pass current video URL and quality to player */}
      {selectedVideo && (
        <VideoPlayer 
          src={selectedVideo.url}
          quality={selectedVideo.label}
          onQualityDetected={setDetectedQuality}  // Callback for Auto detection
        />
      )}

      {/* Display detected quality for Auto mode */}
      <p>Now playing: <strong>{detectedQuality || selectedVideo.label}</strong></p>

      {/* Quality selection buttons */}
      {videoVariants.length > 0 && (
        <div>
          <h4>Select Quality:</h4>
          
          {/* Auto (Master) button */}
          <button onClick={() => 
            setSelectedVideo({ label: 'Auto (Master)', url: masterUrl })
          }>
            Auto (Master)
          </button>

          {/* Manual quality buttons */}
          {videoVariants.map(v => (
            <button key={v.label} onClick={() => setSelectedVideo(v)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Flow Diagram**:
```
1. App mounts
   ↓
2. Axios fetches /getLatestVideo from backend
   ↓
3. Receives: { url: master.m3u8, variants: [720p, 4K] }
   ↓
4. Stores master URL and variants
   ↓
5. Defaults to Auto (Master)
   ↓
6. Renders VideoPlayer with master URL
   ↓
7. User clicks 720p/4K → setSelectedVideo with that URL
   ↓
8. VideoPlayer updates source to new URL
```

#### 2. **VideoPlayer.jsx - Video.js Integration**

```javascript
export default function VideoPlayer({ src, quality, onQualityDetected }) {
  const videoRef = useRef(null);      // Reference to <video> element
  const playerRef = useRef(null);     // Reference to video.js player
  const [currentQuality, setCurrentQuality] = useState(quality);

  // Initialize video.js player once on component mount
  useEffect(() => {
    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      fluid: true
    });
    playerRef.current = player;
    
    return () => player.dispose();
  }, []);

  // Update source when user selects different quality
  useEffect(() => {
    if (!src || !playerRef.current) return;

    // Update player source without recreating player
    playerRef.current.src({
      src,
      type: 'application/x-mpegURL'
    });

    // For manual selections, show quality immediately
    if (quality !== 'Auto (Master)') {
      setCurrentQuality(quality);
      onQualityDetected(quality);
    }

    // For Auto mode, detect which quality is playing
    const detectQuality = () => {
      const hls = playerRef.current.tech().hls;
      const currentLevel = hls.currentLevel;
      const playlist = hls.playlist.playlists[currentLevel];
      const height = playlist.attributes.RESOLUTION.height;
      
      const detected = height === 2160 ? '4K' : '720p';
      setCurrentQuality(`Auto (${detected})`);
      onQualityDetected(`Auto (${detected})`);
    };

    playerRef.current.on('play', detectQuality);
    playerRef.current.on('timeupdate', detectQuality);
  }, [src, quality, onQualityDetected]);

  return (
    <div>
      <div>Quality: {currentQuality}</div>
      <video 
        ref={videoRef} 
        className="video-js vjs-big-play-centered"
        width="800"
      />
    </div>
  );
}
```

**Video.js Player Lifecycle**:
```
1. Initialize player once
   ↓
2. Player attached to <video> element
   ↓
3. When src changes:
   - Call player.src({ src, type: 'application/x-mpegURL' })
   - Video.js loads HLS playlist
   ↓
4. User hits play
   ↓
5. Video.js downloads segments and plays them
   ↓
6. For Auto mode:
   - Listen to 'play' and 'timeupdate' events
   - Read HLS current level/quality
   - Display detected quality to user
```

---

## Complete Data Flow

### When User Starts App

```
Frontend (App.js)
  ↓
  axios.get('http://localhost:3000/getLatestVideo')
  ↓
Backend (Express)
  ↓
  Returns: {
    title: 'Default Video',
    url: 'http://localhost:3000/public/videos/{id}/master.m3u8',
    variants: [
      { label: '720p', url: '...' },
      { label: '4K', url: '...' }
    ]
  }
  ↓
Frontend (App.js)
  ↓
  setSelectedVideo({ label: 'Auto (Master)', url: master.m3u8 })
  ↓
  <VideoPlayer src={master.m3u8} quality="Auto (Master)" />
  ↓
Frontend (VideoPlayer.jsx)
  ↓
  player.src({ src: master.m3u8, type: 'application/x-mpegURL' })
  ↓
Browser Video.js
  ↓
  1. Fetch master.m3u8
  2. Parse available qualities (720p, 4K)
  3. Select best quality based on bandwidth
  4. Fetch that quality's playlist (e.g., 720p/index.m3u8)
  5. Download video segments (index0.ts, index1.ts, ...)
  6. Decode and play video
```

### When User Selects 720p Manually

```
Frontend (Quality Button)
  ↓
  onClick → setSelectedVideo({ label: '720p', url: '...720p/index.m3u8' })
  ↓
Frontend (VideoPlayer.jsx)
  ↓
  useEffect triggered (src changed)
  ↓
  player.src({ src: '...720p/index.m3u8', type: 'application/x-mpegURL' })
  ↓
  setCurrentQuality('720p')
  ↓
  onQualityDetected('720p') → callback to App.js
  ↓
Frontend (App.js)
  ↓
  setDetectedQuality('720p')
  ↓
  Display: "Now playing: 720p"
```

---

## Key Technical Concepts

### 1. HLS (HTTP Live Streaming)

HLS is an adaptive streaming protocol that:
- Breaks videos into small chunks (6 seconds each)
- Provides multiple quality options
- Allows players to switch qualities based on network conditions
- Uses standard HTTP for delivery (firewall-friendly)

**Advantages**:
- Adaptive bitrate (automatic quality switching)
- Works across all browsers and devices
- Scalable (CDN-friendly)
- Low latency for on-demand content

### 2. FFmpeg Conversion

The command used:
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \           # H.264 video codec (compatible)
  -c:a aac \               # AAC audio codec (compatible)
  -hls_time 6 \            # 6 second chunks
  -hls_playlist_type vod \ # Video on Demand (not live)
  output.m3u8
```

This produces:
- A master playlist (m3u8) that lists all variants
- Individual quality playlists
- Video segments (.ts files)

### 3. Video.js Integration

Video.js:
- Wraps the HTML5 `<video>` element
- Adds HLS.js plugin for HLS support
- Provides quality detection via `tech().hls`
- Allows dynamic source updates via `player.src()`

### 4. Adaptive Bitrate Selection

When using Auto (Master):
1. Video.js reads the master playlist
2. Detects available qualities and their bandwidths
3. Monitors network speed
4. Automatically selects optimal quality
5. Can switch mid-playback if bandwidth changes

---

## Running the Application

### Backend Setup
```bash
cd backend
npm install
node index.js
# Listens on http://localhost:3000
# Auto-converts videos from uploads/
```

### Frontend Setup
```bash
cd frontend/video-binge-watch
npm install
npm start
# Runs on http://localhost:3001 (or 3000 if available)
```

### Adding Videos

Place video files in `backend/uploads/`:
- `720.mp4` - will be converted to 720p
- `4k.mp4` - will be converted to 4K

Restart backend to auto-convert.

---

## Summary

This application demonstrates:
- ✅ Video format conversion (MP4 → HLS)
- ✅ Adaptive bitrate streaming
- ✅ Dynamic quality selection
- ✅ Real-time quality detection
- ✅ Responsive React UI
- ✅ Express API backend
- ✅ FFmpeg integration
- ✅ HTTP streaming over standard web protocols
