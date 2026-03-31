import { Easing } from 'react-native-reanimated';

export const MOTION = {
  // Duration (ms)
  quick: 150,
  normal: 300,
  smooth: 500,

  // Spring configs
  snappy: { damping: 15, stiffness: 300 },
  gentle: { damping: 20, stiffness: 150 },
  bouncy: { damping: 10, stiffness: 200 },

  // Easing
  easeOut: Easing.bezier(0.0, 0.0, 0.2, 1.0),
  easeInOut: Easing.bezier(0.4, 0.0, 0.2, 1.0),
} as const;
