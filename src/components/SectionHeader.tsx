import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** "Title ......... See all →" row above home carousels. */
export function SectionHeader({ title, actionLabel = 'See all', onAction }: Props) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Txt variant="titleLarge">{title}</Txt>
      {onAction && (
        <Pressable onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="titleSmall" color={t.colors.primary}>
            {actionLabel}
          </Txt>
          <Ionicons name="chevron-forward" size={16} color={t.colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
