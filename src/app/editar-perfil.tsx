import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Stepper } from '@/components/Stepper';
import { PrimaryButton, SecondaryButton, T } from '@/components/ui';
import type { ProfileRow } from '@/db/tables';
import { fmt, strings } from '@/i18n';
import { answersFromProfile, isSection, isSectionValid, restOf, saveRest, saveSection, type Section } from '@/profile/edit';
import type { OnboardingAnswers } from '@/profile/onboarding';
import {
  DataStep,
  EquipmentStep,
  GoalStep,
  LevelStep,
  NameStep,
  RestrictionsStep,
  RoutineStep,
} from '@/profile/ProfileForms';
import { useProfile } from '@/profile/useProfile';
import { colors, spacing } from '@/theme';
import { REST, type RestTimes } from '@/workout/generator';

const s = strings.editProfile;

/** Editar uma parte do perfil (Perfil → linha). Mostra a mesma pergunta do onboarding. */
export default function EditProfileScreen() {
  const { secao } = useLocalSearchParams<{ secao: string }>();
  const { profile } = useProfile();
  const section: Section = isSection(secao) ? secao : 'data';
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: s.titles[section] }} />
      {profile &&
        (section === 'rest' ? (
          <RestForm profile={profile} />
        ) : (
          // key: recomeça o formulário se outro celular mudar o perfil no meio
          <AnswersForm key={profile.id} profile={profile} section={section} />
        ))}
    </SafeAreaView>
  );
}

function AnswersForm({ profile, section }: { profile: ProfileRow; section: Exclude<Section, 'rest'> }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [a, setA] = useState<OnboardingAnswers>(() => answersFromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const savingRef = useRef(false);
  const set = (patch: Partial<OnboardingAnswers>) => setA((prev) => ({ ...prev, ...patch }));
  const valid = isSectionValid(section, a);

  async function save() {
    if (!valid || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(false);
    try {
      await saveSection(db, profile, section, a);
      router.back();
    } catch {
      setError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {section === 'data' && (
          <>
            <NameStep a={a} set={set} onSubmit={() => undefined} />
            <DataStep a={a} set={set} hideWeight />
          </>
        )}
        {section === 'goal' && <GoalStep a={a} set={set} />}
        {section === 'level' && <LevelStep a={a} set={set} />}
        {section === 'routine' && <RoutineStep a={a} set={set} editing />}
        {section === 'restrictions' && <RestrictionsStep a={a} set={set} />}
        {section === 'equipment' && <EquipmentStep a={a} set={set} />}
        {section !== 'data' && (
          <T variant="caption" color={colors.textSecondary}>
            {s.planNote}
          </T>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {error && (
          <T variant="caption" color={colors.danger} style={{ textAlign: 'center' }}>
            {s.saveError}
          </T>
        )}
        <PrimaryButton label={saving ? s.saving : s.save} onPress={save} disabled={!valid || saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

function RestForm({ profile }: { profile: ProfileRow }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [r, setR] = useState<RestTimes>(() => restOf(profile));
  const [saving, setSaving] = useState(false);
  const d = REST[profile.level];
  const rs = s.rest;

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await saveRest(db, profile, r);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <T variant="body" color={colors.textSecondary}>
          {rs.intro}
        </T>
        <Field label={rs.sets} value={r.sets} step={15} max={300} onChange={(sets) => setR({ ...r, sets })} />
        <Field
          label={rs.circuitExercise}
          value={r.circuitExercise}
          step={5}
          max={60}
          onChange={(circuitExercise) => setR({ ...r, circuitExercise })}
        />
        <Field
          label={rs.circuitRound}
          value={r.circuitRound}
          step={15}
          max={300}
          onChange={(circuitRound) => setR({ ...r, circuitRound })}
        />
        <T variant="caption" color={colors.textSecondary}>
          {fmt(rs.defaultHint, { sets: d.sets, ex: d.circuitExercise, round: d.circuitRound })}
        </T>
        <SecondaryButton label={rs.reset} onPress={() => setR({ ...d })} />
        <T variant="caption" color={colors.textSecondary}>
          {s.planNote}
        </T>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label={saving ? s.saving : s.save} onPress={save} disabled={saving} />
      </View>
    </>
  );
}

/** Descanso em segundos, com − e +. */
function Field({
  label,
  value,
  step,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return <Stepper label={fmt(s.rest.label, { label })} value={value} onChange={onChange} min={0} max={max} step={step} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: 18 },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
});
