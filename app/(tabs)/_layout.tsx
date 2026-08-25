import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../src/components/Txt';
import { radius } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

const TABS: Record<
  string,
  { labelKey: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }
> = {
  home: { labelKey: 'nav.home', icon: 'home-outline', active: 'home' },
  shop: { labelKey: 'nav.shop', icon: 'storefront-outline', active: 'storefront' },
  bookings: { labelKey: 'nav.bookings', icon: 'calendar-outline', active: 'calendar' },
  service: { labelKey: 'nav.service', icon: 'construct-outline', active: 'construct' },
  support: { labelKey: 'nav.support', icon: 'headset-outline', active: 'headset' },
  profile: { labelKey: 'nav.profile', icon: 'person-outline', active: 'person' },
};

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  // Subscribing here re-renders the whole bar on a language switch.
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom > 0 ? insets.bottom : 12 }}>
      <View
        style={[
          styles.bar,
          { backgroundColor: t.colors.surface, borderColor: t.colors.border },
          t.shadows.elevated,
        ]}
      >
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const content = (
            <>
              <Ionicons
                name={focused ? meta.active : meta.icon}
                size={22}
                color={focused ? t.colors.onAccent : t.colors.textSecondary}
              />
              {focused && (
                <Txt
                  variant="labelSmall"
                  color={t.colors.onAccent}
                  // Logical margin so the label sits after the icon in RTL too.
                  style={{ marginStart: 8 }}
                  numberOfLines={1}
                >
                  {tr(meta.labelKey)}
                </Txt>
              )}
            </>
          );

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item}>
              {focused ? (
                <LinearGradient
                  colors={t.gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.itemInner}
                >
                  {content}
                </LinearGradient>
              ) : (
                <View style={styles.itemInner}>{content}</View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  item: { flex: 1 },
  itemInner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
