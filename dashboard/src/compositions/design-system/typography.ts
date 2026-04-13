// Typography system for different ad styles
export const typography = {
  professional: {
    hero: {
      fontSize: 64,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    heading: {
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    subheading: {
      fontSize: 32,
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    body: {
      fontSize: 20,
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: '0em',
    },
    cta: {
      fontSize: 22,
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: '0.5px',
    },
  },

  modern: {
    hero: {
      fontSize: 72,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    heading: {
      fontSize: 52,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    subheading: {
      fontSize: 36,
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    body: {
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: '0em',
    },
    cta: {
      fontSize: 24,
      fontWeight: 800,
      lineHeight: 1.5,
      letterSpacing: '0.5px',
    },
  },

  minimal: {
    hero: {
      fontSize: 56,
      fontWeight: 300,
      lineHeight: 1.3,
      letterSpacing: '0.02em',
    },
    heading: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0.01em',
    },
    subheading: {
      fontSize: 28,
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    body: {
      fontSize: 18,
      fontWeight: 400,
      lineHeight: 1.7,
      letterSpacing: '0em',
    },
    cta: {
      fontSize: 20,
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.5px',
    },
  },
};

export type TypographyStyle = keyof typeof typography;
