import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleProp,
  TextInput,
  type ViewStyle,
} from 'react-native';

/**
 * Keyboard handling, in one place.
 *
 * WHY IT IS SHARED: ten screens with text inputs had no keyboard handling at
 * all, and the three that did each did it differently — one used
 * `behavior="height"` on Android, another `undefined`, with different offsets.
 * Keyboard avoidance is the kind of thing that looks fine on the device the
 * author tested and is broken everywhere else, so there is now exactly one
 * implementation to get right.
 *
 * THE ANDROID RULE THAT IS EASY TO GET WRONG: the manifest sets
 * `adjustResize`, so Android already shrinks the window when the keyboard
 * opens. Adding `behavior="padding"` or `"height"` on top applies the
 * keyboard inset a SECOND time and pushes content roughly a keyboard's height
 * too far up. On Android the correct behavior is therefore `undefined` — let
 * the OS do it. iOS does not resize, so there it must be `"padding"`.
 */
function keyboardBehavior() {
  return Platform.OS === 'ios' ? ('padding' as const) : undefined;
}

interface KeyboardAwareViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Distance between the top of this view and the top of the screen. Needed
   * on iOS when the view does not start at y=0 (e.g. below a header), or the
   * padding is computed against the wrong origin and overshoots.
   */
  offset?: number;
}

/** Plain avoidance for a screen that does not scroll. */
export function KeyboardAwareView({ children, style, offset = 0 }: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={keyboardBehavior()}
      keyboardVerticalOffset={Platform.OS === 'ios' ? offset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/** Extra space kept between the focused field and the top of the keyboard. */
const FOCUS_MARGIN = 24;

type FocusScrollProps = ScrollViewProps & {
  children: ReactNode;
  /** See `KeyboardAwareView.offset`. */
  offset?: number;
  /** Wrap in a KeyboardAvoidingView too. Off when a parent already does. */
  avoid?: boolean;
};

/**
 * A ScrollView that lifts the focused input clear of the keyboard.
 *
 * `automaticallyAdjustKeyboardInsets` covers iOS from RN 0.70, but it only
 * adjusts the CONTENT INSET — it does not scroll a field that is already
 * behind where the keyboard lands, and Android does not implement it at all.
 * So the focused field is measured when the keyboard appears and scrolled up
 * only by the amount it is actually obscured. Scrolling unconditionally would
 * yank the view on every focus even when the field was perfectly visible.
 */
export function KeyboardAwareScrollView({
  children,
  offset = 0,
  avoid = true,
  ...props
}: FocusScrollProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  // Held in a ref so the handler identity is stable. Depending on `props`
  // would rebuild it on every render, which is the opposite of memoising.
  const callerOnScroll = useRef(props.onScroll);
  callerOnScroll.current = props.onScroll;

  const onScroll = useCallback<NonNullable<ScrollViewProps['onScroll']>>((event) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    callerOnScroll.current?.(event);
  }, []);

  useEffect(() => {
    // `keyboardDidShow` rather than `willShow`: the final frame is only known
    // once it has settled, and on Android `willShow` does not fire at all.
    const sub = Keyboard.addListener('keyboardDidShow', (event) => {
      // RN tracks this for us; asking each input to report its own focus
      // would mean touching every call site.
      const focused = (
        TextInput as unknown as {
          State?: { currentlyFocusedInput?: () => { measureInWindow?: Function } | null };
        }
      ).State?.currentlyFocusedInput?.();

      const scroller = scrollRef.current;
      if (!focused?.measureInWindow || !scroller) return;

      const keyboardTop = event.endCoordinates.screenY;

      focused.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        const fieldBottom = y + h + FOCUS_MARGIN;
        const hidden = fieldBottom - keyboardTop;
        // Already clear of the keyboard — leave the scroll position alone.
        if (hidden <= 0) return;
        scroller.scrollTo({ y: scrollY.current + hidden, animated: true });
      });
    });

    return () => sub.remove();
  }, []);

  const scroller = (
    <ScrollView
      ref={scrollRef}
      // A tap on a button while the keyboard is open must hit the button, not
      // just dismiss the keyboard and be swallowed.
      keyboardShouldPersistTaps="handled"
      // Dragging the list down dismisses the keyboard, as everywhere else on iOS.
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      {...props}
      onScroll={onScroll}
    >
      {children}
    </ScrollView>
  );

  if (!avoid) return scroller;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={keyboardBehavior()}
      keyboardVerticalOffset={Platform.OS === 'ios' ? offset : 0}
    >
      {scroller}
    </KeyboardAvoidingView>
  );
}

/**
 * Bottom-sheet padding that tracks the keyboard.
 *
 * A sheet is pinned to the bottom of the screen, so when the keyboard opens it
 * is the FIRST thing covered — and `KeyboardAvoidingView` inside a `Modal`
 * measures against the screen, not the sheet, so it does not help. Padding the
 * sheet by the keyboard height lifts it instead.
 *
 * Returns the height to apply as `paddingBottom`.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS reports the frame BEFORE the animation, so the sheet rises with the
    // keyboard instead of snapping after it. Android has no `will` events.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
