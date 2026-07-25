import { Platform, ViewStyle } from 'react-native';

/** Soft, layered shadows for the "floating card" aesthetic (cross-platform). */
function shadow(color: string, opacity: number, radius: number, y: number, elevation: number): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: y },
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  soft: shadow('#0A0A0B', 0.1, 12, 6, 3),
  card: shadow('#0A0A0B', 0.14, 20, 10, 6),
  elevated: shadow('#0A0A0B', 0.2, 28, 16, 12),
};
