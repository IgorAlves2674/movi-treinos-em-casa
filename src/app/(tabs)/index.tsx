import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronRightIcon, PlayIcon, PlusIcon } from '@/components/icons';
import { OptionsMenu } from '@/components/OptionsMenu';
import { Card, PrimaryButton, Screen, T } from '@/components/ui';
import type { BodyLog } from '@/db/tables';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { formatLongDate, strings } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

const s = strings.home;

/**
 * Início (spec seção 3). Nesta etapa a estrutura segue o protótipo; os dados
 * de plano, sequência e recordes chegam nas próximas etapas.
 */
export default function HomeScreen() {
  const router = useRouter();
  const today = new Date();
  const { rows: weights } = useLiveQuery<Pick<BodyLog, 'weight_kg'>>(
    `SELECT weight_kg FROM body_logs
     WHERE deleted_at IS NULL AND weight_kg IS NOT NULL
     ORDER BY logged_on DESC, updated_at DESC LIMIT 1`,
    [],
    ['body_logs'],
  );
  const lastWeight = weights[0]?.weight_kg;

  return (
    <Screen>
      <View style={styles.topBar}>
        <T variant="logo" color={colors.primary}>
          movi<T variant="logo">.</T>
        </T>
        <OptionsMenu />
      </View>

      <View style={{ gap: spacing.xs }}>
        <T variant="h1">{s.greetingNoName}</T>
        <T variant="body" color={colors.textSecondary}>
          {formatLongDate(today)}
        </T>
      </View>

      <WeekStrip today={today} />

      <View style={styles.todayCard}>
        <View style={{ gap: 6 }}>
          <T variant="overline" color={colors.primaryOnDark}>
            {s.weeklyPlan}
          </T>
          <T variant="h2" color={colors.textOnDark}>
            {s.todayWorkout}
          </T>
          <T variant="body" color={colors.textOnDarkSecondary}>
            {s.weeklyPlanEmpty}
          </T>
        </View>
        <PrimaryButton label={s.startWorkout} icon={<PlayIcon />} disabled />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate('/treinos')}
        style={({ pressed }) => [styles.customCard, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={styles.plusBox}>
          <PlusIcon />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title">{s.customWorkout}</T>
          <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
            {s.customWorkoutHint}
          </T>
        </View>
        <ChevronRightIcon />
      </Pressable>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <T variant="caption" color={colors.textSecondary}>
            {s.weight}
          </T>
          <T variant="h2">
            {lastWeight != null ? `${String(lastWeight).replace('.', ',')} kg` : s.noData}
          </T>
          {lastWeight == null && (
            <T variant="caption" color={colors.textSecondary}>
              {s.noWeightYet}
            </T>
          )}
        </Card>
        <Card style={styles.statCard}>
          <T variant="caption" color={colors.textSecondary}>
            {s.lastRecord}
          </T>
          <T variant="h2">{s.noData}</T>
          <T variant="caption" color={colors.textSecondary}>
            {s.noRecordYet}
          </T>
        </Card>
      </View>
    </Screen>
  );
}

/** Semana de segunda a domingo, com o dia de hoje marcado. */
function WeekStrip({ today }: { today: Date }) {
  const todayIndex = (today.getDay() + 6) % 7; // 0 = segunda
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="label">{s.thisWeek}</T>
      <View style={styles.weekRow}>
        {strings.dates.weekInitialsMonFirst.map((initial, i) => (
          <View key={i} style={styles.dayCol}>
            <T variant="caption" color={colors.textSecondary}>
              {initial}
            </T>
            {i === todayIndex ? (
              <View style={[styles.dayDot, styles.dayToday]}>
                <T variant="caption" color={colors.primary} style={styles.todayText}>
                  {strings.dates.today}
                </T>
              </View>
            ) : (
              <View style={[styles.dayDot, { backgroundColor: colors.surfaceMuted }]} />
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 2, borderColor: colors.primary },
  todayText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  todayCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: 18,
    gap: 14,
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  plusBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.xs, padding: 14 },
});
