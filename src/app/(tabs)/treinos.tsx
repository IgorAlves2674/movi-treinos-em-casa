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
import { generateWorkout, type GeneratorProfile } from '@/workout/generator';

const s = strings.workouts;
const MINUTES: GeneratorProfile['minutes'][] = [15, 30, 45, 60];

/**
 * Treinos (spec seção 3): montar treino avulso + histórico (etapa 6).
 * Todo treino é de corpo inteiro; aqui só dá para escolher a duração do dia.
 */
export default function WorkoutsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  // Começa com o tempo do perfil, mas o treino avulso pode ser mais curto ou mais longo.
  const [minutes, setMinutes] = useState<GeneratorProfile['minutes'] | null>(null);
  const chosen = minutes ?? profile?.minutes_per_session ?? 30;

  function build() {
    if (!profile) return;
    setDraft({ workout: generateWorkout({ ...generatorProfile(profile), minutes: chosen }), minutes: chosen });
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
        <View style={{ gap: spacing.sm }}>
          <T variant="label">{s.duration}</T>
          <View style={styles.chips}>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                label={fmt(strings.onboarding.routine.minutesValue, { n: m })}
                selected={chosen === m}
                onPress={() => setMinutes(m)}
              />
            ))}
          </View>
        </View>
        {profile && (
          <T variant="caption" color={colors.textSecondary}>
            {fmt(s.settingsLine, { level: s.levels[profile.level].toLowerCase() })}
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
