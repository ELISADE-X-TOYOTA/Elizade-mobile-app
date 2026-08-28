/**
 * Collapses concurrent calls into one in-flight operation.
 *
 * WHY THE REFRESH PATH NEEDS THIS: a screen fires several requests at once, so
 * one expired access token produces a burst of simultaneous 401s. If each of
 * them refreshed independently, the first would rotate the refresh token and
 * the rest would present the now-spent one — which the backend treats as token
 * theft and answers by revoking the whole family. The app would log itself out
 * by trying too hard to stay signed in.
 *
 * So the first caller runs the operation and every caller that arrives while
 * it is still running awaits the same promise. Once it settles the slot is
 * released, so a LATER expiry starts a fresh attempt rather than replaying a
 * stale result.
 *
 * Kept free of React Native imports so it can be compiled and tested on its own.
 */
export function singleFlight<T>(operation: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (!inFlight) {
      // `finally` rather than `then`: the slot must be released on rejection
      // too, or one failed refresh would wedge every future one forever.
      inFlight = operation().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}
