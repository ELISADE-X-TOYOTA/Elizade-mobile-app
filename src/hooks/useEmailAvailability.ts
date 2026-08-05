import { useEffect, useRef, useState } from 'react';
import { checkEmailAvailable } from '../data/authRepository';
import { isValidEmail } from '../utils/sanitize';

export type EmailStatus = 'empty' | 'invalid' | 'checking' | 'available' | 'taken';

export interface EmailAvailabilityResult {
  status: EmailStatus;
  reason?: string;
  /** True only when the address is well-formed AND free to register. */
  eligible: boolean;
}

/** Pause after typing before we ask the server. */
const DEBOUNCE_MS = 450;

/**
 * Live signup-email validation.
 *
 * Runs format validation instantly and, once the address is well-formed,
 * debounces a server availability check. Responses are matched against the
 * current input before being applied, so a slow reply for an earlier value
 * can't overwrite the result for what the user has since typed.
 */
export function useEmailAvailability(email: string): EmailAvailabilityResult {
  const [state, setState] = useState<EmailAvailabilityResult>({
    status: 'empty',
    eligible: false,
  });

  /** The value the in-flight request was issued for. */
  const inFlightFor = useRef('');

  useEffect(() => {
    const value = email.trim();

    if (!value) {
      setState({ status: 'empty', eligible: false });
      return;
    }
    if (!isValidEmail(value)) {
      setState({ status: 'invalid', eligible: false });
      return;
    }

    setState({ status: 'checking', eligible: false });
    inFlightFor.current = value;

    const timer = setTimeout(async () => {
      const res = await checkEmailAvailable(value);
      // Ignore if the user kept typing while this was in flight.
      if (inFlightFor.current !== value) return;
      setState(
        res.available
          ? { status: 'available', eligible: true }
          : { status: 'taken', reason: res.reason, eligible: false },
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [email]);

  return state;
}
