import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeadTracker, stageLabel } from '../../src/components/LeadTracker';
import { Skeleton } from '../../src/components/Skeleton';
import { Txt } from '../../src/components/Txt';
import { leadsApi, type LeadDetailDto } from '../../src/api/leads';
import { solid, tint } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/theme/useTheme';

/**
 * One enquiry: where it stands, who is handling it, and what has happened.
 *
 * The history shows only what staff explicitly published — see `LeadNote`
 * on the backend. An enquiry with no published notes shows its status
 * changes alone, which is still a truthful account of its progress.
 */
export default function LeadDetailScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lead, setLead] = useState<LeadDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      setError(undefined);
      try {
        setLead(await leadsApi.detail(id));
      } catch {
        setError(t('leads.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  const dateTimeFmt = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <Stack.Screen options={{ title: t('leads.detailTitle') }} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.screenH,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.colors.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton height={120} radius={radius.lg} />
            <Skeleton height={200} radius={radius.lg} />
          </View>
        ) : error || !lead ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={28} color={theme.colors.textTertiary} />
            <Txt variant="titleSmall" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              {error ?? t('errors.notFound')}
            </Txt>
            <Pressable
              onPress={() => {
                setLoading(true);
                load();
              }}
              style={{ marginTop: spacing.md }}
            >
              <Txt variant="titleSmall" color={theme.colors.accentText}>
                {t('common.retry')}
              </Txt>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <Txt variant="labelMedium" tone="secondary">
                {t('leads.interestedIn')}
              </Txt>
              <Txt variant="titleLarge" style={{ marginTop: 4 }}>
                {lead.interestedModel}
              </Txt>

              {lead.vehicle ? (
                <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                  {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                </Txt>
              ) : null}

              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: tint(theme.colors.accent, 0.12),
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <Txt
                  variant="labelSmall"
                  color={
                    lead.stage === 'converted'
                      ? theme.colors.successText
                      : lead.stage === 'closed'
                        ? theme.colors.textTertiary
                        : theme.colors.accentText
                  }
                >
                  {stageLabel(t, lead.stage, lead.stageLabel)}
                </Txt>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              <Row
                label={t('leads.representative')}
                value={
                  lead.assignedAgent
                    ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`
                    : t('leads.noRepresentative')
                }
              />
              <Row label={t('leads.opened')} value={dateTimeFmt(lead.createdAt)} />
            </Card>

            {/* Tracker */}
            <SectionTitle>{t('leads.progress')}</SectionTitle>
            <Card>
              <LeadTracker steps={lead.tracker} />
            </Card>

            {/* History */}
            <SectionTitle>{t('leads.history')}</SectionTitle>
            <Card>
              {lead.timeline.length === 0 ? (
                <Txt variant="bodySmall" tone="secondary">
                  {t('leads.noHistory')}
                </Txt>
              ) : (
                lead.timeline
                  .slice()
                  // Newest first reads better as a log, while the tracker
                  // above already shows the forward progression.
                  .reverse()
                  .map((entry, i) => (
                    <View key={`${entry.at}-${i}`} style={styles.entry}>
                      <View
                        style={[
                          styles.entryDot,
                          {
                            backgroundColor: entry.isNote
                              ? theme.colors.textTertiary
                              : solid(theme.colors.accent),
                          },
                        ]}
                      />
                      <View style={{ flex: 1, marginStart: spacing.sm }}>
                        <Txt variant="titleSmall">
                          {entry.stage
                            ? stageLabel(t, entry.stage, entry.title)
                            : entry.title || t('leads.updateFrom')}
                        </Txt>
                        {entry.body ? (
                          <Txt variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                            {entry.body}
                          </Txt>
                        ) : null}
                        <Txt variant="labelSmall" tone="tertiary" style={{ marginTop: 4 }}>
                          {dateTimeFmt(entry.at)}
                        </Txt>
                      </View>
                    </View>
                  ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        theme.shadows.soft,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelMedium" tone="secondary" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
      {children}
    </Txt>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Txt variant="bodySmall" tone="secondary" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="bodyMedium" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  divider: { height: 1, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: spacing.sm },
  entry: { flexDirection: 'row', paddingVertical: spacing.sm },
  entryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
});
