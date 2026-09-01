import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { clearSession } from '../api/session';
import { decideOnResume } from '../security/lockPolicy';
import { useStore } from '../store/useStore';

/**
 * Ends the session after five minutes in the background.
 *
 * Renders nothing. It is mounted once at the root purely to own the AppState
 * subscription — a hook called from a screen would unsubscribe the moment that
 * screen unmounted, which is precisely when the app is being navigated away
 * from.
 *
 * The timestamp lives in a ref rather than state on purpose: writing it would
 * re-render the whole tree on every background transition, and nothing renders
 * from it.
 */
export function SessionTimeoutWatcher() {
  const backgroundedAt = useRef<number | null>(null);
  /** Guards against two resume events racing into two sign-outs. */
  const signingOut = useRef(false);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        /*
          `inactive` is included deliberately. On iOS it covers the app switcher
          and a notification pulled down over the app; treating only `background`
          as "away" leaves a gap on exactly the transitions someone uses to peek
          at another app. Coming straight back is well inside five minutes, so
          the stricter reading costs a legitimate user nothing.

          Only the FIRST transition is recorded — iOS fires inactive → background
          as a pair, and overwriting would restart the clock on the second.
        */
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        return;
      }
      if (next !== 'active') return;

      const startedAt = backgroundedAt.current;
      backgroundedAt.current = null;

      const user = useStore.getState().currentUser;
      const action = decideOnResume({
        hasSession: !!user,
        backgroundedAt: startedAt,
        now: Date.now(),
      });
      if (action === 'restore') return;
      if (signingOut.current) return;
      signingOut.current = true;

      void (async () => {
        try {
          // Order matters. The in-memory token is dropped by `clearSession`
          // BEFORE the store is cleared and the route changes, so no screen
          // unmounting behind the navigation can fire one last authenticated
          // request with a credential the session no longer has.
          const email = user?.email;
          await clearSession();
          useStore.getState().setCurrentUser(null);
          router.replace({
            pathname: '/(auth)/login',
            // Prefilled, and told why — retyping your own address after the app
            // logged you out is a small insult on top of an interruption.
            params: { ...(email ? { email } : {}), reason: 'timeout' },
          });
        } finally {
          signingOut.current = false;
        }
      })();
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return null;
}
