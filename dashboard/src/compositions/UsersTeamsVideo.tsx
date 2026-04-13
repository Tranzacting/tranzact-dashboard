import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
  staticFile,
  spring,
  useVideoConfig,
} from 'remotion';

export const UsersTeamsVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert frames to seconds
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
      {/* Intro Section (0-1.5s) */}
      <Sequence from={0} durationInFrames={Math.round(1.5 * fps)}>
        <IntroSection />
      </Sequence>

      {/* Feature Showcase (1.5-4.5s) */}
      <Sequence from={Math.round(1.5 * fps)} durationInFrames={Math.round(3 * fps)}>
        <FeatureShowcase />
      </Sequence>

      {/* Feature Highlights (4.5-7.5s) */}
      <Sequence from={Math.round(4.5 * fps)} durationInFrames={Math.round(3 * fps)}>
        <FeatureHighlights />
      </Sequence>

      {/* CTA Section (7.5-10s) */}
      <Sequence from={Math.round(7.5 * fps)} durationInFrames={Math.round(2 * fps)}>
        <CTASection />
      </Sequence>

      {/* End Screen (10-12.5s) */}
      <Sequence from={Math.round(9.5 * fps)} durationInFrames={Math.round(3 * fps)}>
        <EndScreen />
      </Sequence>
    </AbsoluteFill>
  );
};

const IntroSection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.5, fps * 1.3], [0, 1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, fps * 0.5], [0.8, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
      }}
    >
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <img
          src={staticFile('tranzact-logo.png')}
          alt="TranZact"
          style={{
            height: 60,
            width: 'auto',
            opacity: 0.95,
          }}
        />
      </div>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            marginBottom: 20,
          }}
        >
          Collaborate with Your Team
        </h1>
        <p
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.9)',
            margin: 0,
          }}
        >
          Manage users, assign teams, and control permissions
        </p>
      </div>
    </AbsoluteFill>
  );
};

const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame % Math.round(3 * fps);
  const opacity = interpolate(localFrame, [0, fps * 0.3, fps * 2.7, fps * 3], [0, 1, 1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 100, mass: 1, overshootClamping: true },
    delay: fps * 0.2,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 40,
        opacity,
      }}
    >
      <div style={{ transform: `scale(${0.9 + scale * 0.1})`, textAlign: 'center', maxWidth: 900 }}>
        <div
          style={{
            backgroundColor: '#f0f4ff',
            padding: 30,
            borderRadius: 16,
            marginBottom: 30,
            boxShadow: '0 20px 60px rgba(0, 102, 204, 0.15)',
          }}
        >
          <img
            src={staticFile('assets/Image - Add team members.png')}
            alt="Users & Teams Interface"
            style={{
              maxWidth: '100%',
              height: 'auto',
              maxHeight: 500,
              borderRadius: 12,
              border: '2px solid #0066CC',
            }}
          />
        </div>
        <h2
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: '#0066CC',
            margin: '20px 0 15px 0',
          }}
        >
          Manage Your Team
        </h2>
        <p
          style={{
            fontSize: 22,
            color: '#555',
            margin: 0,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          Add team members, assign roles, and manage permissions in one place
        </p>
      </div>
    </AbsoluteFill>
  );
};

const FeatureHighlights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame % Math.round(3 * fps);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        padding: 60,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ maxWidth: 1000 }}>
        <h2
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: 60,
          }}
        >
          Key Features
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
          }}
        >
          <HighlightCard
            title="Add Team Members"
            description="Quickly invite and onboard new team members"
            index={0}
            frame={localFrame}
            fps={fps}
          />
          <HighlightCard
            title="Assign Roles"
            description="Control what each team member can access and do"
            index={1}
            frame={localFrame}
            fps={fps}
          />
          <HighlightCard
            title="Manage Permissions"
            description="Fine-grained control over document access"
            index={2}
            frame={localFrame}
            fps={fps}
          />
          <HighlightCard
            title="Team Collaboration"
            description="Enable seamless workflow across your organization"
            index={3}
            frame={localFrame}
            fps={fps}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const HighlightCard: React.FC<{
  title: string;
  description: string;
  index: number;
  frame: number;
  fps: number;
}> = ({ title, description, index, frame, fps }) => {
  const startFrame = index * (fps * 0.5);
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + fps * 0.3, fps * 3 - fps * 0.3, fps * 3],
    [0, 1, 1, 0],
    {
      easing: Easing.inOut(Easing.ease),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const translateY = interpolate(
    frame,
    [startFrame, startFrame + fps * 0.3],
    [30, 0],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        padding: 30,
        backgroundColor: '#EBF3FF',
        borderRadius: 12,
        borderLeft: '4px solid #0066CC',
      }}
    >
      <h3
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#333',
          margin: '0 0 12px 0',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 16,
          color: '#666',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
};

const CTASection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame % Math.round(2 * fps);
  const opacity = interpolate(localFrame, [0, fps * 0.3, fps * 1.7, fps * 2], [0, 1, 1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 100, mass: 1, overshootClamping: true },
    delay: fps * 0.2,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
        opacity,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          transform: `scale(${0.9 + scale * 0.1})`,
        }}
      >
        <h2
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 20px 0',
          }}
        >
          Start Collaborating Today
        </h2>
        <p
          style={{
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0 0 40px 0',
          }}
        >
          Empower your team with TranZact
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '16px 40px',
            backgroundColor: 'white',
            borderRadius: 50,
            fontWeight: 'bold',
            fontSize: 20,
            color: '#0066CC',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          Get Started
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame % Math.round(3 * fps);

  const opacity = interpolate(
    localFrame,
    [0, fps * 0.3, fps * 2.7, fps * 3],
    [0, 1, 1, 0],
    {
      easing: Easing.inOut(Easing.ease),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const scale = interpolate(
    localFrame,
    [0, fps * 0.5],
    [0.9, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
        opacity,
      }}
    >
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <img
          src={staticFile('tranzact-logo.png')}
          alt="TranZact"
          style={{
            height: 60,
            width: 'auto',
            opacity: 0.95,
          }}
        />
      </div>
      <div
        style={{
          textAlign: 'center',
          transform: `scale(${scale})`,
          maxWidth: 800,
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 30px 0',
            lineHeight: 1.3,
          }}
        >
          India's #1 Software for Manufacturers
        </h1>
        <p
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.95)',
            margin: '0 0 50px 0',
            fontWeight: 500,
          }}
        >
          Simplify operations. Increase efficiency. Scale faster.
        </p>
        <div
          style={{
            display: 'inline-block',
            padding: '18px 50px',
            backgroundColor: 'white',
            borderRadius: 50,
            fontWeight: 'bold',
            fontSize: 22,
            color: '#0066CC',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          Book a Demo
        </div>
      </div>
    </AbsoluteFill>
  );
};
