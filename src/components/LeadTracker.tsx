import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { LeadStage, LeadTrackerStepDto } from '../api/leads';
import { solid } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/useTheme';
import { Txt } from './Txt';

/**
 * The four-step lifecycle tracker.
 *
 * Renders vertically rather than as a horizontal stepper: stage labels are
 * two or three words in English and considerably longer in Hausa and Yoruba
 * ("Ana dubawa", "À ń ṣàyẹ̀wò"), and four of those across a phone screen
 * either truncate or wrap into an uneven mess. A vertical list gives every
 * label the full width whatever the language.
 */
export function LeadTracker({ steps }: { steps: LeadTrackerStepDto[] }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const closed = step.stage === 'closed';
        // A closed lead reached the end without converting — neutral, not
        // success, and never an error: the customer did nothing wrong.
        const tone = closed
          ? theme.colors.textTertiary
          : step.reached
            ? solid(theme.colors.accent)
            : theme.colors.border;

        return (
          <View key={step.stage} style={styles.row}>
            {/* Rail: dot + connector */}
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: step.reached ? tone : theme.colors.surface,
                    borderColor: tone,
                  },
                ]}
              >
                {step.reached ? (
                  <Ionicons
                    name={closed ? 'remove' : 'checkmark'}
                    size={13}
                    color={closed ? theme.colors.surface : theme.colors.onAccent}
                  />
                ) : null}
              </View>
              {!last ? (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: step.reached ? tone : theme.colors.border },
                  ]}
                />
              ) : null}
            </View>

            <View style={[styles.body, last && { paddingBottom: 0 }]}>
              <Txt
                variant={step.current ? 'titleSmall' : 'bodyMedium'}
                color={step.reached ? theme.colors.textPrimary : theme.colors.textTertiary}
              >
                {stageLabel(t, step.stage, step.label)}
              </Txt>
              {step.current ? (
                <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                  {stageDescription(t, step.stage)}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Translates a stage, falling back to the server's English label.
 *
 * The fallback matters: if a stage is ever added server-side before the app
 * ships a translation for it, the customer sees a real English word rather
 * than the raw key `leads.stage.some_new_stage`.
 */
export function stageLabel(
  t: TFunction,
  stage: LeadStage,
  serverLabel?: string,
): string {
  const key = `leads.stage.${stage}`;
  const translated = t(key);
  return translated === key ? (serverLabel ?? stage) : translated;
}

export function stageDescription(t: TFunction, stage: LeadStage): string {
  const key = `leads.stageDescription.${stage}`;
  const translated = t(key);
  return translated === key ? '' : translated;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { width: 34, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `flex: 1` lets the connector stretch to whatever height the label wraps
  // to, so a three-line Yoruba label does not break the rail.
  connector: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },
  body: {
    flex: 1,
    // Logical margin: mirrors automatically under RTL rather than pinning
    // the text to the left of the rail in Arabic.
    marginStart: spacing.sm,
    paddingBottom: spacing.md,
  },
});
