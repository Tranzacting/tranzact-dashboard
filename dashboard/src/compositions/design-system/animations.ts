import { Easing, interpolate } from 'remotion';

// Animation presets for different styles
export const animations = {
  // Subtle animations for professional content
  subtle: {
    fade: (frame: number, fps: number, duration: number) => ({
      opacity: interpolate(
        frame,
        [0, fps * 0.3, fps * (duration - 0.3), fps * duration],
        [0, 1, 1, 0],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
    }),
    slideInLeft: (frame: number, fps: number, duration: number) => ({
      transform: interpolate(
        frame,
        [0, fps * 0.5, fps * duration],
        [-100, 0, 0],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
      opacity: interpolate(
        frame,
        [0, fps * 0.3, fps * (duration - 0.2), fps * duration],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }),
    scaleUp: (frame: number, fps: number, duration: number) => ({
      scale: interpolate(
        frame,
        [0, fps * 0.5, fps * duration],
        [0.8, 1, 1],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
      opacity: interpolate(
        frame,
        [0, fps * 0.3, fps * (duration - 0.2), fps * duration],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }),
  },

  // Energetic animations for younger audiences
  energetic: {
    bounce: (frame: number, fps: number, duration: number) => ({
      scale: interpolate(
        frame,
        [0, fps * 0.2, fps * 0.4, fps * duration],
        [0.6, 1.1, 1, 1],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
      opacity: interpolate(
        frame,
        [0, fps * 0.2, fps * (duration - 0.2), fps * duration],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }),
    slideInBottom: (frame: number, fps: number, duration: number) => ({
      translateY: interpolate(
        frame,
        [0, fps * 0.4, fps * duration],
        [100, 0, 0],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
      opacity: interpolate(
        frame,
        [0, fps * 0.3, fps * (duration - 0.2), fps * duration],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }),
    rotate: (frame: number, fps: number, duration: number) => ({
      rotate: interpolate(
        frame,
        [0, fps * 0.5, fps * duration],
        [-5, 0, 0],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
      opacity: interpolate(
        frame,
        [0, fps * 0.3, fps * (duration - 0.2), fps * duration],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      ),
    }),
  },

  // Smooth animations for professional content
  smooth: {
    parallax: (frame: number, fps: number, duration: number, offset: number = 20) => ({
      translateY: interpolate(
        frame,
        [0, fps * duration],
        [0, offset],
        {
          easing: Easing.linear,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
    }),
    zoom: (frame: number, fps: number, duration: number) => ({
      scale: interpolate(
        frame,
        [0, fps * duration],
        [1, 1.05],
        {
          easing: Easing.inOut(Easing.ease),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      ),
    }),
  },
};

export type AnimationStyle = 'subtle' | 'energetic' | 'smooth';
