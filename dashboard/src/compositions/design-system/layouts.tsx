import React from 'react';
import { AbsoluteFill } from 'remotion';

interface LayoutProps {
  background: string;
  children: React.ReactNode;
  logo?: string;
  opacity?: number;
}

// Hero Center - Full screen with centered content
export const HeroCenter: React.FC<LayoutProps> = ({ background, children, logo, opacity = 1 }) => (
  <AbsoluteFill
    style={{
      background,
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
    }}
  >
    {logo && (
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: 60, width: 'auto', opacity: 0.95 }}
        />
      </div>
    )}
    {children}
  </AbsoluteFill>
);

// Hero Left - Content on left, image on right
export const HeroLeft: React.FC<
  LayoutProps & { image?: string; imageStyle?: React.CSSProperties }
> = ({ background, children, logo, image, imageStyle, opacity = 1 }) => (
  <AbsoluteFill
    style={{
      background,
      display: 'flex',
      opacity,
    }}
  >
    {logo && (
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <img src={logo} alt="Logo" style={{ height: 60, width: 'auto' }} />
      </div>
    )}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 80 }}>
      {children}
    </div>
    {image && (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 40 }}>
        <img src={image} alt="Content" style={{ maxWidth: '100%', maxHeight: '80%', ...imageStyle }} />
      </div>
    )}
  </AbsoluteFill>
);

// Split Screen - Two equal halves
export const SplitScreen: React.FC<
  LayoutProps & {
    leftContent: React.ReactNode;
    rightContent: React.ReactNode;
    rightBackground?: string;
  }
> = ({ background, logo, leftContent, rightContent, rightBackground, opacity = 1 }) => (
  <AbsoluteFill style={{ opacity }}>
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, background, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 60 }}>
        {logo && (
          <div style={{ position: 'absolute', top: 40, left: 40 }}>
            <img src={logo} alt="Logo" style={{ height: 60, width: 'auto' }} />
          </div>
        )}
        {leftContent}
      </div>
      <div
        style={{
          flex: 1,
          background: rightBackground || background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 60,
        }}
      >
        {rightContent}
      </div>
    </div>
  </AbsoluteFill>
);

// Card Grid - Multiple cards in grid layout
export const CardGrid: React.FC<
  LayoutProps & { cards: React.ReactNode[]; columns?: number }
> = ({ background, children, logo, cards, columns = 2, opacity = 1 }) => (
  <AbsoluteFill
    style={{
      background,
      padding: 60,
      opacity,
    }}
  >
    {logo && (
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <img src={logo} alt="Logo" style={{ height: 60, width: 'auto' }} />
      </div>
    )}
    <div style={{ marginBottom: 60 }}>{children}</div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 40,
        marginTop: 40,
      }}
    >
      {cards.map((card, idx) => (
        <div key={idx}>{card}</div>
      ))}
    </div>
  </AbsoluteFill>
);

// Full Bleed - Image/video background with overlay text
export const FullBleed: React.FC<
  LayoutProps & { backgroundImage?: string; overlayOpacity?: number }
> = ({ background, backgroundImage, overlayOpacity = 0.4, children, logo, opacity = 1 }) => (
  <AbsoluteFill style={{ opacity }}>
    {backgroundImage && (
      <img
        src={backgroundImage}
        alt="Background"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
        }}
      />
    )}
    <AbsoluteFill
      style={{
        background: backgroundImage ? `rgba(0, 0, 0, ${overlayOpacity})` : background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {logo && (
        <div style={{ position: 'absolute', top: 40, left: 40 }}>
          <img src={logo} alt="Logo" style={{ height: 60, width: 'auto', opacity: 0.95 }} />
        </div>
      )}
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);
