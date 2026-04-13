import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { UsersTeamsVideo } from '../compositions/UsersTeamsVideo';

export const VideoPreview: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#333' }}>
        Users & Teams Video Preview
      </h1>

      <div
        style={{
          backgroundColor: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '30px',
          aspectRatio: '16/9',
        }}
      >
        <Player
          component={UsersTeamsVideo}
          durationInFrames={375}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          loop
          autoPlay={true}
          controls
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#333' }}>Video Specifications</h3>
        <ul style={{ color: '#666', margin: 0 }}>
          <li>Duration: 12.5 seconds (375 frames at 30fps)</li>
          <li>Resolution: 1920x1080 (Full HD)</li>
          <li>Format: MP4 (H.264)</li>
          <li>Codec: H.264</li>
        </ul>
      </div>

      <div
        style={{
          backgroundColor: '#f0f4ff',
          padding: '20px',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#333' }}>To Render Video to MP4:</h3>
        <p style={{ color: '#666', marginBottom: '10px' }}>
          Run the following command in the dashboard directory:
        </p>
        <code
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '4px',
            display: 'block',
            color: '#d63384',
            fontFamily: 'monospace',
            fontSize: '14px',
            overflowX: 'auto',
          }}
        >
          npx remotion render src/Root.tsx UsersTeamsVideo output.mp4
        </code>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
          Note: FFmpeg must be installed on your system to render videos.
        </p>
      </div>
    </div>
  );
};
