import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/form';
import { Card, PrimaryButton, Screen, T } from '@/components/ui';
import { fmt, strings } from '@/i18n';
import { useProfile } from '@/profile/useProfile';
import { colors, spacing } from '@/theme';
import { setDraft } from '@/workout/draft';
import { generatorProfile } from '@/workout/fromProfile';
import { FOCUS_GROUPS, generateWorkout, type FocusGroup } from '@/workout/generator';

const s = strings.workouts;

/** Treinos (spec seção 3): montar treino avulso + histórico (etapa 6). */
export default function WorkoutsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [focus, setFocus] = useState<FocusGroup[]>(['corpo_inteiro']);

  // "Corpo inteiro" é exclusivo; os outros grupos podem ser combinados.
  function toggle(g: FocusGroup) {
    if (g === 'corpo_inteiro') return setFocus(['corpo_inteiro']);
    const rest = focus.filter((x) => x !== 'corpo_inteiro');
    const next = rest.includes(g) ? rest.filter((x) => x !== g) : [...rest, g];
    setFocus(next.length ? next : ['corpo_inteiro']);
  }

  function build() {
    if (!profile) return;
    setDraft(generateWorkout(focus, generatorProfile(profile)), focus);
    router.push('/treino');
  }

  return (
    <Screen>
      <T variant="h1">{s.title}</T>
      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <T variant="title">{s.buildTitle}</T>
          <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
            {s.buildHint}
          </T>
        </View>
        <View style={styles.chips}>
          {FOCUS_GROUPS.map((g) => (
            <Chip key={g} label={s.groups[g]} selected={focus.includes(g)} onPress={() => toggle(g)} />
          ))}
        </View>
        {profile && (
          <T variant="caption" color={colors.textSecondary}>
            {fmt(s.settingsLine, { minutes: profile.minutes_per_session, level: s.levels[profile.level] })}
          </T>
        )}
        <PrimaryButton label={s.build} onPress={build} disabled={!profile} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <T variant="title">{s.history}</T>
        <Card>
          <T variant="body" color={colors.textSecondary}>
            {s.historyEmpty}
          </T>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
