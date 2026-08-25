import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../src/components/Skeleton';
import { Txt } from '../src/components/Txt';
import { stageLabel } from '../src/components/LeadTracker';
import { leadsApi, type LeadDto } from '../src/api/leads';
import { solid, tint } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { useTheme } from '../src/theme/useTheme';

/**
 * "My Leads" — every enquiry this customer has open with the dealership,
 * mirroring what staff see on the admin portal for the same rows.
 */
export default function LeadsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(undefined);
    try {
      setLeads(await leadsApi.list());
    } catch {
      // The specific failure is not actionable for a customer; the retry is.
      setError(t('leads.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // `t` is stable per language; re-created on switch so the message follows.
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <Stack.Screen options={{ title: t('leads.title') }} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screenH,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.textSecondary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="bodyMedium" tone="secondary" style={{ marginBottom: spacing.md }}>
          {t('leads.subtitle')}
        </Txt>

        {loading ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={96} radius={radius.lg} />
            <Skeleton height={96} radius={radius.lg} />
            <Skeleton height={96} radius={radius.lg} />
          </View>
        ) : error ? (
          <Empty
            icon="cloud-offline-outline"
            title={error}
            action={t('common.retry')}
            onAction={() => {
              setLoading(true);
              load();
            }}
          />
        ) : leads.length === 0 ? (
          <Empty icon="document-text-outline" title={t('leads.empty')} body={t('leads.emptyHint')} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {leads.map((lead) => (
              <Pressable
                key={lead.id}
                onPress={() => router.push(`/lead/${lead.id}`)}
                accessibilityRole="button"
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  theme.shadows.soft,
                ]}
              >
                <View style={styles.cardHead}>
                  <Txt variant="titleSmall" style={{ flex: 1 }} numberOfLines={1}>
                    {lead.interestedModel}
                  </Txt>
                  <StagePill lead={lead} />
                </View>

                <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
                  {t('leads.updatedOn', { date: dateFmt(lead.updatedAt) })}
                </Txt>

                {/* Compact progress: four segments, filled to the current step. */}
                <View style={styles.segments}>
                  {Array.from({ length: lead.stepCount }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        {
                          backgroundColor:
                            i <= lead.stepIndex
                              ? lead.stage === 'closed'
                                ? theme.colors.textTertiary
                                : solid(theme.colors.accent)
                              : theme.colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>

                {lead.assignedAgent ? (
                  <Txt variant="bodySmall" tone="tertiary" style={{ marginTop: 8 }}>
                    {t('leads.representative')}: {lead.assignedAgent.firstName}{' '}
                    {lead.assignedAgent.lastName}
                  </Txt>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StagePill({ lead }: { lead: LeadDto }) {
  const theme = useTheme();
  const { t } = useTranslation();
  // Converted is the only positive terminal state; closed is neutral.
  const color =
    lead.stage === 'converted'
      ? theme.colors.successText
      : lead.stage === 'closed'
        ? theme.colors.textTertiary
        : theme.colors.accentText;

  return (
    <View style={[styles.pill, { backgroundColor: tint(theme.colors.accent, 0.12) }]}>
      <Txt variant="labelSmall" color={color}>
        {stageLabel(t, lead.stage, lead.stageLabel)}
      </Txt>
    </View>
  );
}

function Empty({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Ionicons name={icon} size={26} color={theme.colors.textTertiary} />
      </View>
      <Txt variant="titleSmall" style={{ textAlign: 'center', marginTop: spacing.sm }}>
        {title}
      </Txt>
      {body ? (
        <Txt variant="bodySmall" tone="secondary" style={{ textAlign: 'center', marginTop: 6 }}>
          {body}
        </Txt>
      ) : null}
      {action && onAction ? (
        <Pressable onPress={onAction} style={{ marginTop: spacing.md }}>
          <Txt variant="titleSmall" color={theme.colors.accentText}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  segments: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
