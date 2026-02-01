import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import 'video.js/dist/video-js.css';

export default function VideoPlayer({ src, quality, onQualityDetected }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [currentQuality, setCurrentQuality] = useState(quality);

  // Initialize player once
  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    console.log('Initializing video.js player');

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      fluid: true
    });

    playerRef.current = player;

    player.on('ready', () => {
      console.log('Video.js player ready');
    });

    player.on('error', (err) => {
      console.error('Player error:', err, player.error());
    });

    player.on('play', () => {
      console.log('Video started playing');
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Update source when src changes
  useEffect(() => {
    if (!src || !playerRef.current) {
      console.log('No src or player available');
      return;
    }

    console.log('Updating player source to:', src, 'quality:', quality);
    
    playerRef.current.src({
      src,
      type: 'application/x-mpegURL'
    });

    // For manual quality selections, show the quality immediately
    if (quality !== 'Auto (Master)') {
      setCurrentQuality(quality);
      if (onQualityDetected) onQualityDetected(quality);
    } else {
      setCurrentQuality('Auto (Master) - detecting...');
    }

    // Detect quality for auto mode
    const detectQuality = () => {
      try {
        const player = playerRef.current;
        if (player.tech() && player.tech().hls) {
          const hls = player.tech().hls;
          if (hls.playlist && hls.playlist.playlists) {
            const currentLevel = hls.currentLevel;
            if (currentLevel !== undefined && currentLevel >= 0) {
              const playlist = hls.playlist.playlists[currentLevel];
              if (playlist && playlist.attributes) {
                const resolution = playlist.attributes.RESOLUTION;
                if (resolution) {
                  const height = resolution.height;
                  const detectedQuality = height === 2160 ? '4K' : '720p';
                  console.log(`Playing: ${detectedQuality}`);
                  
                  if (quality === 'Auto (Master)') {
                    const displayQuality = `Auto (${detectedQuality})`;
                    setCurrentQuality(displayQuality);
                    if (onQualityDetected) onQualityDetected(displayQuality);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not detect quality:', e);
      }
    };

    playerRef.current.on('play', detectQuality);
    playerRef.current.on('timeupdate', detectQuality);
  }, [src, quality, onQualityDetected]);

  return (
    <div>
      {currentQuality && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '10px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          Quality: {currentQuality}
        </div>
      )}
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
        width="800"
      />
    </div>
  );
}
