// Color schemes for different ad variations
export const colorSchemes = {
  brandBlue: {
    primary: '#0066CC',
    secondary: '#0052A3',
    accent: '#EBF3FF',
    text: '#FFFFFF',
    background: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
  },
  modernGradient: {
    primary: '#FF6B35',
    secondary: '#F7931E',
    accent: '#FFF3E0',
    text: '#FFFFFF',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
  },
  minimalBW: {
    primary: '#000000',
    secondary: '#333333',
    accent: '#F5F5F5',
    text: '#FFFFFF',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #333333 100%)',
  },
  vibrantTeal: {
    primary: '#00B4D8',
    secondary: '#0096C7',
    accent: '#CAF0F8',
    text: '#FFFFFF',
    background: 'linear-gradient(135deg, #00B4D8 0%, #0096C7 100%)',
  },
  successGreen: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#D1FAE5',
    text: '#FFFFFF',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
};

export type ColorScheme = keyof typeof colorSchemes;
