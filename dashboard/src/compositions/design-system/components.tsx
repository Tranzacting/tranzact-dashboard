import React from 'react';
import { typography, TypographyStyle } from './typography';

interface TextProps {
  text: string;
  style?: 'hero' | 'heading' | 'subheading' | 'body' | 'cta';
  typographyStyle?: TypographyStyle;
  color?: string;
  align?: 'left' | 'center' | 'right';
  customStyle?: React.CSSProperties;
}

// Reusable Text Component
export const Text: React.FC<TextProps> = ({
  text,
  style = 'body',
  typographyStyle = 'professional',
  color = 'white',
  align = 'center',
  customStyle,
}) => {
  const typo = typography[typographyStyle][style];

  return (
    <div
      style={{
        fontSize: typo.fontSize,
        fontWeight: typo.fontWeight,
        lineHeight: typo.lineHeight,
        letterSpacing: typo.letterSpacing,
        color,
        textAlign: align,
        fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif",
        margin: 0,
        ...customStyle,
      }}
    >
      {text}
    </div>
  );
};

interface CTAButtonProps {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  onClick?: () => void;
  customStyle?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

// Reusable CTA Button
export const CTAButton: React.FC<CTAButtonProps> = ({
  text,
  backgroundColor = 'white',
  textColor = '#0066CC',
  onClick,
  customStyle,
  size = 'medium',
}) => {
  const sizeMap = {
    small: { padding: '12px 32px', fontSize: 18 },
    medium: { padding: '16px 40px', fontSize: 22 },
    large: { padding: '20px 60px', fontSize: 24 },
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-block',
        ...sizeMap[size],
        backgroundColor,
        borderRadius: 50,
        fontWeight: 700,
        color: textColor,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif",
        border: 'none',
        ...customStyle,
      }}
    >
      {text}
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Reusable Feature Card
export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  backgroundColor = '#EBF3FF',
  borderColor = '#0066CC',
  textColor = '#333',
}) => (
  <div
    style={{
      padding: 30,
      backgroundColor,
      borderRadius: 12,
      borderLeft: `4px solid ${borderColor}`,
      fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif",
    }}
  >
    {icon && <div style={{ marginBottom: 15, fontSize: 32 }}>{icon}</div>}
    <h3
      style={{
        fontSize: 24,
        fontWeight: 600,
        color: textColor,
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

interface ImageBoxProps {
  src: string;
  alt: string;
  borderRadius?: number;
  shadow?: boolean;
  border?: string;
  maxWidth?: string;
  maxHeight?: string;
}

// Reusable Image Box
export const ImageBox: React.FC<ImageBoxProps> = ({
  src,
  alt,
  borderRadius = 12,
  shadow = true,
  border,
  maxWidth = '100%',
  maxHeight = '600px',
}) => (
  <img
    src={src}
    alt={alt}
    style={{
      maxWidth,
      maxHeight,
      height: 'auto',
      borderRadius,
      boxShadow: shadow ? '0 20px 60px rgba(0, 0, 0, 0.15)' : 'none',
      border: border || 'none',
    }}
  />
);
