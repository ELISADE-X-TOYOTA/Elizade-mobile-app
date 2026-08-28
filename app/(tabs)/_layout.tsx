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
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // The tab scene had no background of its own, so it painted React
        // Navigation's default light grey behind every tab — visible as a pale
        // flash between tabs in dark mode. Transparent lets the single themed
        // wallpaper in the root layout show through, exactly like Stack routes.
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
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
    <View
      style={{
        position: 'absolute',
        left: BAR_MARGIN_H,
        right: BAR_MARGIN_H,
        bottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
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

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tr(meta.labelKey)}
              style={styles.item}
            >
              {/*
                The highlight wraps the ICON ONLY, so its width is a constant
                46pt (icon + px-3) that fits inside every column on every
                phone. It cannot reach a neighbour because it cannot outgrow
                its own cell.
              */}
              {focused ? (
                <LinearGradient
                  colors={t.gradients.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pill}
                >
                  <Ionicons name={meta.active} size={ICON_SIZE} color={t.colors.onAccent} />
                </LinearGradient>
              ) : (
                <View style={styles.pill}>
                  <Ionicons name={meta.icon} size={ICON_SIZE} color={t.colors.textSecondary} />
                </View>
              )}

              {/*
                The label sits BELOW the highlight and gets the full column
                width, which is the only way a word fits next to six tabs on a
                phone. Its row is always reserved, so the bar does not change
                height when the active tab moves.
              */}
              <Txt
                variant="labelSmall"
                color={focused ? t.colors.accentText : t.colors.textTertiary}
                style={[styles.label, !focused && styles.labelInactive]}
                // The RN equivalent of white-space: nowrap. A long translation
                // ("Reservations", "Ndebe oche") truncates inside its own
                // column instead of wrapping or spilling into the next tab.
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tr(meta.labelKey)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Tab sizing — a fixed six-column grid.
 *
 * THE ORIGINAL BUG: every tab was `flex: 1` but only the focused one rendered
 * a label, so the yellow pill had to fit an icon AND a word into one sixth of
 * the bar. It could not, so it clipped its own text and pushed into its
 * neighbours.
 *
 * THE FIRST FIX grew the active tab into the leftover space. That stopped the
 * clipping, but a growing cell necessarily moves the cells after it — the
 * whole row shuffled every time you changed tab.
 *
 * THIS FIX removes the growth entirely. Each column is a fixed 1/6 of the bar
 * and never changes size, so nothing can shift. What made that possible is
 * moving the label OUT of the highlight: the pill now wraps only the icon
 * (a constant 46pt) and the label sits beneath it with the whole column to
 * itself. Both fit, and neither can reach outside its own cell.
 *
 * The geometry is not guessable, so it is written down:
 *   column at 360pt = (360 - 24 margin - 16 padding) / 6 = 53.3pt
 *   pill            = 22 icon + 24 padding             = 46.0pt  (fits)
 *   label room      = column - 4                       = 49.3pt  ("Bookings" fits)
 * Longer translations ellipsize inside the column rather than overflowing it.
 */
const ICON_SIZE = 22;      // glyph size, identical on all six tabs
const PILL_PAD_H = 12;     // px-3 — active pill inner padding
const PILL_PAD_V = 6;      // py-1.5
const BAR_PAD = 8;         // bar padding
const BAR_MARGIN_H = 12;   // bar inset from the screen edge
/** Reserved so the bar keeps its height whichever tab is active. */
const LABEL_LINE_H = 13;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    // Every column is the same fixed width, so this only centres the row;
    // there is never leftover space for it to distribute.
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: BAR_PAD,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  item: {
    // A fixed 1/6 column. `flexShrink: 0` and `flexGrow: 0` together mean no
    // tab can ever be squeezed or stretched by what its neighbours contain —
    // which is precisely what stops one tab's label disturbing the others.
    flexBasis: `${100 / 6}%`,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PILL_PAD_H,
    paddingVertical: PILL_PAD_V,
    borderRadius: radius.pill,
  },
  label: {
    marginTop: 2,
    height: LABEL_LINE_H,
    lineHeight: LABEL_LINE_H,
    // 10, not the 11 of labelSmall: at 11 "Bookings" ellipsizes on a 360pt
    // screen, which is the width most Android phones actually are.
    fontSize: 10,
    textAlign: 'center',
    // Bounds the text to its own column. Without a width the Text lays out at
    // its natural size and overflows the cell before `numberOfLines` clips it.
    alignSelf: 'stretch',
  },
  // Inactive labels sit back so the active one still reads as selected.
  labelInactive: { opacity: 0.75 },
});
