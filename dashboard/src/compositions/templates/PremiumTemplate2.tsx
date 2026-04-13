import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { HeroLeft, Text, CTAButton, ImageBox, colorSchemes, animations } from '../design-system';

interface PremiumTemplate2Props {
  headline: string;
  subheadline: string;
  cta: string;
  imageUrl?: string;
  colorScheme?: keyof typeof colorSchemes;
  animationStyle?: 'subtle' | 'energetic' | 'smooth';
  typographyStyle?: 'professional' | 'modern' | 'minimal';
}

export const PremiumTemplate2: React.FC<PremiumTemplate2Props> = ({
  headline,
  subheadline,
  cta,
  imageUrl,
  colorScheme = 'modernGradient',
  animationStyle = 'subtle',
  typographyStyle = 'modern',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = colorSchemes[colorScheme];
  const animationSet = animations[animationStyle];

  // Scene animation
  const sceneOpacity = animationSet.fade(frame, fps, 12.5);
  const imageScale = animationSet.smooth.zoom(frame, fps, 12.5);

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={Math.round(12.5 * fps)}>
        <HeroLeft
          background={colors.background}
          logo={staticFile('tranzact-logo.png')}
          image={imageUrl || staticFile('assets/Image - Add team members.png')}
          opacity={sceneOpacity.opacity}
          imageStyle={{
            transform: `scale(${1 + (imageScale.scale - 1) * 0.05})`,
            transition: 'transform 0.1s ease',
          }}
        >
          <div style={{ maxWidth: 500 }}>
            <Text
              text={headline}
              style="hero"
              typographyStyle={typographyStyle}
              color={colors.text}
              align="left"
              customStyle={{ marginBottom: 20 }}
            />
            <Text
              text={subheadline}
              style="body"
              typographyStyle={typographyStyle}
              color={colors.text}
              align="left"
              customStyle={{ marginBottom: 40, opacity: 0.95 }}
            />
            <CTAButton
              text={cta}
              backgroundColor={colors.accent}
              textColor={colors.primary}
              size="large"
            />
          </div>
        </HeroLeft>
      </Sequence>
    </AbsoluteFill>
  );
};
