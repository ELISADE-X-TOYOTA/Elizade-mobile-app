import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { clearSession, touchActivity } from '../api/session';
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
 *
 * It is ALSO persisted. The ref only survives while the process does, and iOS
 * ends backgrounded processes routinely — so a relaunch used to restore the
 * session with no idea how long it had been away. The stamp written here is
 * what the splash screen reads to apply the same rule at cold start.
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
        if (backgroundedAt.current === null) {
          const now = Date.now();
          backgroundedAt.current = now;
          // Persisted for the cold-start check. Only while signed in — a
          // stamp with no session behind it is noise the next sign-in clears.
          if (useStore.getState().currentUser) void touchActivity(now);
        }
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
      if (action === 'restore') {
        // Back in use: move the stamp forward so a later crash in the
        // foreground is judged from now, not from the last background.
        if (user) void touchActivity();
        return;
      }
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
