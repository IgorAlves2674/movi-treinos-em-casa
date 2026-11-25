import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckRow, ProgressBar } from '@/components/form';
import { ChevronLeftIcon } from '@/components/icons';
import { Card, PrimaryButton, T } from '@/components/ui';
import { fmt, strings } from '@/i18n';
import { EMPTY_ANSWERS, isStepValid, saveOnboarding, STEPS, type OnboardingAnswers } from '@/profile/onboarding';
import {
  DataStep,
  EquipmentStep,
  GoalStep,
  LevelStep,
  NameStep,
  RestrictionsStep,
  RoutineStep,
  Title,
  type SetAnswers,
  type StepProps,
} from '@/profile/ProfileForms';
import { useProfile } from '@/profile/useProfile';
import { colors, spacing } from '@/theme';

const s = strings.onboarding;

/**
 * Onboarding (spec seção 4): uma pergunta por tela, com barra de progresso.
 * Nada é gravado até a última tela (ciência + consentimento dos dados de saúde).
 */
export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const savingRef = useRef(false);

  const current = STEPS[step];
  const valid = isStepValid(current, answers);
  const isLast = step === STEPS.length - 1;
  const set: SetAnswers = (patch) => setAnswers((prev) => ({ ...prev, ...patch }));

  const goTo = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Botão "voltar" do Android volta uma tela do onboarding.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  // Perfil salvo (agora ou antes): segue para o app.
  if (profile) return <Redirect href="/" />;

  async function next() {
    // savingRef (e não só o estado) evita gravar duas vezes num toque duplo rápido.
    if (!valid || savingRef.current) return;
    if (!isLast) return goTo(step + 1);
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await saveOnboarding(db, answers);
    } catch {
      savingRef.current = false;
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={s.back}
            onPress={() => goTo(step - 1)}
            disabled={step === 0}
            hitSlop={12}
            style={{ opacity: step === 0 ? 0 : 1 }}
          >
            <ChevronLeftIcon />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ProgressBar value={(step + 1) / STEPS.length} />
          </View>
          <T variant="caption" color={colors.textSecondary}>
            {fmt(s.progress, { step: step + 1, total: STEPS.length })}
          </T>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {current === 'name' && <NameStep a={answers} set={set} onSubmit={next} />}
          {current === 'data' && <DataStep a={answers} set={set} />}
          {current === 'goal' && <GoalStep a={answers} set={set} />}
          {current === 'level' && <LevelStep a={answers} set={set} />}
          {current === 'routine' && <RoutineStep a={answers} set={set} />}
          {current === 'restrictions' && <RestrictionsStep a={answers} set={set} />}
          {current === 'equipment' && <EquipmentStep a={answers} set={set} />}
          {current === 'consent' && <ConsentStep a={answers} set={set} />}
        </ScrollView>

        <View style={styles.footer}>
          {isLast && !valid && (
            <T variant="caption" color={colors.textSecondary} style={styles.center}>
              {s.consent.required}
            </T>
          )}
          {saveError && (
            <T variant="caption" color={colors.danger} style={styles.center}>
              {s.saveError}
            </T>
          )}
          <PrimaryButton
            label={saving ? s.saving : isLast ? s.finish : s.next}
            onPress={next}
            disabled={!valid || saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConsentStep({ a, set }: StepProps) {
  const c = s.consent;
  return (
    <>
      <Title title={c.title} />
      <Card style={styles.warning}>
        <T variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
          {c.health}
        </T>
      </Card>
      <CheckRow label={c.healthAck} checked={a.healthAck} onPress={() => set({ healthAck: !a.healthAck })} />
      <CheckRow
        label={c.dataConsent}
        checked={a.healthDataConsent}
        onPress={() => set({ healthDataConsent: !a.healthDataConsent })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: 18 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  warning: { borderColor: '#F3D9B5', backgroundColor: '#FFF8EC' },
  center: { textAlign: 'center' },
});
