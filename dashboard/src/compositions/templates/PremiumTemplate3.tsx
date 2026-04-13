import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { CardGrid, Text, CTAButton, FeatureCard, colorSchemes, animations } from '../design-system';

interface Feature {
  title: string;
  description: string;
}

interface PremiumTemplate3Props {
  headline: string;
  features: Feature[];
  cta: string;
  colorScheme?: keyof typeof colorSchemes;
  animationStyle?: 'subtle' | 'energetic' | 'smooth';
  typographyStyle?: 'professional' | 'modern' | 'minimal';
}

export const PremiumTemplate3: React.FC<PremiumTemplate3Props> = ({
  headline,
  features,
  cta,
  colorScheme = 'successGreen',
  animationStyle = 'subtle',
  typographyStyle = 'professional',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = colorSchemes[colorScheme];
  const animationSet = animations[animationStyle];

  // Scene animation
  const sceneOpacity = animationSet.fade(frame, fps, 12.5);

  // Feature card animations - stagger effect
  const featureAnimations = features.map((_, idx) => {
    const delayStart = idx * fps * 0.5;
    const delayEnd = delayStart + fps * 2;
    return animationSet.fade(frame - delayStart, fps, delayEnd - delayStart);
  });

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={Math.round(12.5 * fps)}>
        <CardGrid
          background={colors.background}
          logo={staticFile('tranzact-logo.png')}
          opacity={sceneOpacity.opacity}
          columns={2}
          cards={features.map((feature, idx) => (
            <div
              key={idx}
              style={{
                opacity: featureAnimations[idx]?.opacity || 0,
                transform: `translateY(${20 * (1 - (featureAnimations[idx]?.opacity || 0))}px)`,
                transition: 'all 0.3s ease',
              }}
            >
              <FeatureCard
                title={feature.title}
                description={feature.description}
                backgroundColor={colors.accent}
                borderColor={colors.primary}
              />
            </div>
          ))}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Text
              text={headline}
              style="heading"
              typographyStyle={typographyStyle}
              color={colors.text}
            />
          </div>
        </CardGrid>

        {/* CTA at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: sceneOpacity.opacity,
          }}
        >
          <CTAButton
            text={cta}
            backgroundColor={colors.accent}
            textColor={colors.primary}
            size="large"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
