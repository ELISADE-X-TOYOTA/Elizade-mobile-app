import { Alert } from 'react-native';
import i18n from '../i18n';
import { setHardwareProtection } from '../api/session';
import { authenticate, getCapabilities } from './biometrics';
import { useSecurityStore } from '../store/useSecurityStore';

/**
 * Offer App Lock once, just after sign-in.
 *
 * WHY HERE. It is the one moment the customer has actively proved who they are
 * and is thinking about their account. A prompt on first launch lands before
 * there is anything to protect; one buried in settings is never found.
 *
 * WHY ONCE. A security prompt that returns every launch gets dismissed on
 * reflex, and having trained someone to dismiss it you have made them less safe
 * than never asking. Declining is recorded and respected; the setting stays in
 * Profile for whenever they want it.
 */
export async function offerAppLockEnrollment(): Promise<void> {
  const store = useSecurityStore.getState();
  if (store.enrollmentOffered || store.appLockEnabled) return;

  const caps = await getCapabilities();
  // Nothing to offer on a device with no gate of its own — asking would only
  // advertise a feature the handset cannot provide.
  if (!caps.canUseAppLock) return;

  store.markEnrollmentOffered();

  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

  Alert.alert(
    t('appLock.enrollTitle'),
    t('appLock.enrollBody', { method: t(`appLock.method.${caps.method}`) }),
    [
      { text: t('appLock.enrollLater'), style: 'cancel' },
      {
        text: t('appLock.enrollEnable'),
        onPress: async () => {
          // Prove the gate opens before arming it — see `security.tsx`.
          const outcome = await authenticate(t('appLock.confirmEnable'), t('common.cancel'));
          if (!outcome.ok) return;
          await setHardwareProtection(true);
          useSecurityStore.getState().setAppLockEnabled(true);
        },
      },
    ],
  );
}
