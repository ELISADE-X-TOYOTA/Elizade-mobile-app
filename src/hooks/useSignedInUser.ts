import { router } from 'expo-router';
import { useEffect } from 'react';
import { APP } from '../constants/app';
import { MOCK_USER } from '../data/mock';
import { UserProfile } from '../domain/types';
import { useStore } from '../store/useStore';

/**
 * The signed-in customer, or a redirect to login.
 *
 * WHY THIS EXISTS: the tab screens read `currentUser ?? MOCK_USER`. Whenever
 * the store was empty — a restore that returned nothing, a session that ended
 * mid-flight, any path that reached a tab without a user — the app rendered
 * the DEMO customer's name, email and vehicles as though someone were signed
 * in. Nobody had entered a credential; the app just looked logged in. That is
 * the auto-login, and a plain `??` is what caused it: a fallback silently
 * substituting fake identity for missing identity.
 *
 * MOCK_USER survives only where it is honest — the offline demo build, where
 * there is no real account by design.
 *
 * Returns `null` while redirecting, so callers must handle it. That is
 * deliberate: it makes "there is no user" impossible to ignore at the call
 * site, which is exactly how the old `??` slipped through.
 */
export function useSignedInUser(): UserProfile | null {
  const user = useStore((s) => s.currentUser);

  useEffect(() => {
    // In the demo build there is nothing to sign in to.
    if (APP.useMock || user) return;
    router.replace('/(auth)/login');
  }, [user]);

  if (user) return user;
  return APP.useMock ? MOCK_USER : null;
}
