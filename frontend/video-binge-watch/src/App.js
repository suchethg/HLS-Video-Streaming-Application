import { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import axios from 'axios';

function App() {
  const [videoVariants, setVideoVariants] = useState([]);
  const [masterUrl, setMasterUrl] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [detectedQuality, setDetectedQuality] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:3000/getLatestVideo")
      .then(res => {
        console.log("Video data from backend:", res.data);
        setVideoVariants(res.data.variants || []);
        setMasterUrl(res.data.url);
        // Default to Auto (Master)
        setSelectedVideo({ label: 'Auto (Master)', url: res.data.url });
      })
      .catch(err => console.error("Error fetching video data:", err));
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h2>HLS Video Player</h2>
      {selectedVideo ? (
        <>
          <VideoPlayer src={selectedVideo.url} quality={selectedVideo.label} onQualityDetected={setDetectedQuality} />
          <p>Now playing: <strong>{detectedQuality || selectedVideo.label}</strong></p>

          {videoVariants.length > 0 && (
            <>
              <h4>Select Quality:</h4>
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => setSelectedVideo({ label: 'Auto (Master)', url: masterUrl })}
                  style={{ 
                    marginRight: '10px', 
                    padding: '8px 16px',
                    backgroundColor: selectedVideo.label === 'Auto (Master)' ? '#007bff' : '#e9ecef',
                    color: selectedVideo.label === 'Auto (Master)' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Auto (Master)
                </button>
                {videoVariants.map(v => (
                  <button
                    key={v.label}
                    onClick={() => setSelectedVideo(v)}
                    style={{ 
                      marginRight: '10px',
                      padding: '8px 16px',
                      backgroundColor: selectedVideo.label === v.label ? '#007bff' : '#e9ecef',
                      color: selectedVideo.label === v.label ? '#fff' : '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p>No videos available. Upload a video to the backend first.</p>
      )}
    </div>
  );
}

export default App;
