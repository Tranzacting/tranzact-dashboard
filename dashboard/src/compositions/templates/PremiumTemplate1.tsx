import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { HeroCenter, Text, CTAButton, colorSchemes, typography, animations } from '../design-system';

interface PremiumTemplate1Props {
  headline: string;
  subheadline: string;
  cta: string;
  colorScheme?: keyof typeof colorSchemes;
  animationStyle?: 'subtle' | 'energetic' | 'smooth';
  typographyStyle?: 'professional' | 'modern' | 'minimal';
}

export const PremiumTemplate1: React.FC<PremiumTemplate1Props> = ({
  headline,
  subheadline,
  cta,
  colorScheme = 'brandBlue',
  animationStyle = 'subtle',
  typographyStyle = 'professional',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = colorSchemes[colorScheme];
  const animationSet = animations[animationStyle];

  // Scene 1: Intro (0-1.5s)
  const introAnimation = animationSet.fade(frame, fps, 1.5);

  // Scene 2: Main Content (1.5-10s)
  const contentAnimation = frame < fps * 1.5
    ? animationSet.fade(frame - fps * 1.5, fps, 8.5)
    : animationSet.fade((frame - fps * 1.5) % (fps * 8.5), fps, 8.5);

  // Scene 3: CTA (10-12.5s)
  const ctaAnimation = frame < fps * 10
    ? animationSet.fade(frame - fps * 10, fps, 2.5)
    : animationSet.fade((frame - fps * 10) % (fps * 2.5), fps, 2.5);

  return (
    <AbsoluteFill>
      {/* Intro Scene */}
      <Sequence from={0} durationInFrames={Math.round(1.5 * fps)}>
        <HeroCenter
          background={colors.background}
          logo={staticFile('tranzact-logo.png')}
          opacity={introAnimation.opacity}
        >
          <div style={{ textAlign: 'center', transform: `scale(${introAnimation.scale || 1})` }}>
            <Text
              text={headline}
              style="hero"
              typographyStyle={typographyStyle}
              color={colors.text}
            />
          </div>
        </HeroCenter>
      </Sequence>

      {/* Content Scene */}
      <Sequence from={Math.round(1.5 * fps)} durationInFrames={Math.round(8.5 * fps)}>
        <HeroCenter
          background={colors.background}
          logo={staticFile('tranzact-logo.png')}
          opacity={contentAnimation.opacity}
        >
          <div style={{ textAlign: 'center', maxWidth: 800 }}>
            <Text
              text={headline}
              style="heading"
              typographyStyle={typographyStyle}
              color={colors.text}
              customStyle={{ marginBottom: 20 }}
            />
            <Text
              text={subheadline}
              style="subheading"
              typographyStyle={typographyStyle}
              color={colors.text}
              customStyle={{ opacity: 0.9 }}
            />
          </div>
        </HeroCenter>
      </Sequence>

      {/* CTA Scene */}
      <Sequence from={Math.round(10 * fps)} durationInFrames={Math.round(2.5 * fps)}>
        <HeroCenter
          background={colors.background}
          logo={staticFile('tranzact-logo.png')}
          opacity={ctaAnimation.opacity}
        >
          <div style={{ textAlign: 'center' }}>
            <Text
              text={headline}
              style="hero"
              typographyStyle={typographyStyle}
              color={colors.text}
              customStyle={{ marginBottom: 40 }}
            />
            <CTAButton
              text={cta}
              backgroundColor={colors.accent}
              textColor={colors.primary}
              size="large"
            />
          </div>
        </HeroCenter>
      </Sequence>
    </AbsoluteFill>
  );
};
