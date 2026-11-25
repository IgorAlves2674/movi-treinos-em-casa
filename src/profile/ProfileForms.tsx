import { StyleSheet, View } from 'react-native';

import { CheckRow, Chip, Field, OptionCard } from '@/components/form';
import { T } from '@/components/ui';
import type { Equipamento } from '@/content/exercises/types';
import type { Goal, Level, Sex } from '@/db/tables';
import { fmt, strings } from '@/i18n';
import { inRange, isUnderage, LIMITS, parseNumber, type OnboardingAnswers } from '@/profile/onboarding';
import { colors, spacing } from '@/theme';

/**
 * Perguntas do perfil (spec seção 4). Usadas no onboarding e para editar no Perfil.
 */
const s = strings.onboarding;

export function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="h1">{title}</T>
      {subtitle ? (
        <T variant="body" color={colors.textSecondary} style={{ fontSize: 15 }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

export type SetAnswers = (patch: Partial<OnboardingAnswers>) => void;
export type StepProps = { a: OnboardingAnswers; set: SetAnswers };

export function NameStep({ a, set, onSubmit }: StepProps & { onSubmit: () => void }) {
  return (
    <>
      <Title title={s.name.title} subtitle={s.name.subtitle} />
      <Field
        label={s.name.label}
        value={a.name}
        onChangeText={(name) => set({ name })}
        placeholder={s.name.placeholder}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={40}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        autoFocus
      />
    </>
  );
}

/** Mensagem de erro de um campo numérico (só depois que algo foi digitado). */
export function rangeError(text: string, range: readonly [number, number]): string | null {
  if (!text.trim()) return null;
  return inRange(parseNumber(text), range) ? null : fmt(s.data.outOfRange, { min: range[0], max: range[1] });
}

export function DataStep({ a, set, hideWeight = false }: StepProps & { hideWeight?: boolean }) {
  const d = s.data;
  const ageError = isUnderage(a)
    ? d.underage
    : a.age.trim() && !Number.isInteger(parseNumber(a.age))
      ? fmt(d.outOfRange, { min: LIMITS.age[0], max: LIMITS.age[1] })
      : rangeError(a.age, LIMITS.age);
  return (
    <>
      <Title title={d.title} subtitle={d.subtitle} />
      <Field
        label={d.age}
        unit={d.ageUnit}
        value={a.age}
        onChangeText={(age) => set({ age })}
        keyboardType="number-pad"
        maxLength={3}
        error={ageError}
      />
      {!hideWeight && (
        <Field
          label={d.weight}
          unit={d.weightUnit}
          value={a.weight}
          onChangeText={(weight) => set({ weight })}
          keyboardType="decimal-pad"
          maxLength={5}
          error={rangeError(a.weight, LIMITS.weight)}
        />
      )}
      <Field
        label={d.height}
        unit={d.heightUnit}
        value={a.height}
        onChangeText={(height) => set({ height })}
        keyboardType="number-pad"
        maxLength={3}
        error={rangeError(a.height, LIMITS.height)}
      />
      <View style={{ gap: 6 }}>
        <T variant="label">
          {d.sex}{' '}
          <T variant="caption" color={colors.textSecondary}>
            ({s.optional})
          </T>
        </T>
        <View style={styles.chips}>
          {(Object.keys(d.sexOptions) as Sex[]).map((sex) => (
            <Chip
              key={sex}
              label={d.sexOptions[sex]}
              selected={a.sex === sex}
              onPress={() => set({ sex: a.sex === sex ? null : sex })}
            />
          ))}
        </View>
      </View>
    </>
  );
}

export function GoalStep({ a, set }: StepProps) {
  const g = s.goal;
  return (
    <>
      <Title title={g.title} subtitle={g.subtitle} />
      {(Object.keys(g.options) as Goal[]).map((goal) => (
        <OptionCard
          key={goal}
          label={g.options[goal].label}
          hint={g.options[goal].hint}
          selected={a.goal === goal}
          onPress={() => set({ goal })}
        />
      ))}
    </>
  );
}

export function LevelStep({ a, set }: StepProps) {
  const l = s.level;
  return (
    <>
      <Title title={l.title} subtitle={l.subtitle} />
      {(Object.keys(l.options) as Level[]).map((level) => (
        <OptionCard
          key={level}
          label={l.options[level].label}
          hint={l.options[level].hint}
          selected={a.level === level}
          onPress={() => set({ level })}
        />
      ))}
    </>
  );
}

const MINUTES = [15, 30, 45, 60] as const;

/** `editing`: no Perfil o subtítulo ("pode mudar depois no Perfil") não faz sentido. */
export function RoutineStep({ a, set, editing = false }: StepProps & { editing?: boolean }) {
  const r = s.routine;
  return (
    <>
      <Title title={r.title} subtitle={editing ? undefined : r.subtitle} />
      <View style={{ gap: spacing.sm }}>
        <T variant="label">{r.days}</T>
        <View style={styles.chips}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} label={String(n)} selected={a.daysPerWeek === n} onPress={() => set({ daysPerWeek: n })} />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <T variant="label">{r.minutes}</T>
        <View style={styles.chips}>
          {MINUTES.map((n) => (
            <Chip
              key={n}
              label={fmt(r.minutesValue, { n })}
              selected={a.minutesPerSession === n}
              onPress={() => set({ minutesPerSession: n })}
            />
          ))}
        </View>
      </View>
    </>
  );
}

export function RestrictionsStep({ a, set }: StepProps) {
  const r = s.restrictions;
  return (
    <>
      <Title title={r.title} subtitle={r.subtitle} />
      <CheckRow
        label={r.jumpsNoise.label}
        hint={r.jumpsNoise.hint}
        checked={a.avoidJumpsNoise}
        onPress={() => set({ avoidJumpsNoise: !a.avoidJumpsNoise })}
      />
      <CheckRow
        label={r.impact.label}
        hint={r.impact.hint}
        checked={a.avoidImpact}
        onPress={() => set({ avoidImpact: !a.avoidImpact })}
      />
    </>
  );
}

/** Equipamentos por categoria (spec seção 4). Os sempre disponíveis não aparecem. */
const EQUIPMENT_GROUPS: { key: keyof typeof s.equipment.categories; items: Equipamento[] }[] = [
  { key: 'pesos', items: ['halteres', 'barra_anilhas', 'kettlebell', 'caneleira'] },
  { key: 'barras', items: ['barra_fixa', 'step'] },
  { key: 'elasticos', items: ['elastico_alca', 'miniband'] },
  { key: 'cardio', items: ['corda', 'esteira', 'bicicleta', 'eliptico'] },
];

export function EquipmentStep({ a, set }: StepProps) {
  const e = s.equipment;
  const toggle = (item: Equipamento) =>
    set({ equipment: a.equipment.includes(item) ? a.equipment.filter((x) => x !== item) : [...a.equipment, item] });
  return (
    <>
      <Title title={e.title} subtitle={e.subtitle} />
      {EQUIPMENT_GROUPS.map((group) => (
        <View key={group.key} style={{ gap: spacing.sm }}>
          <T variant="overline" color={colors.textSecondary}>
            {e.categories[group.key].toUpperCase()}
          </T>
          {group.items.map((item) => (
            <CheckRow key={item} label={e.items[item as keyof typeof e.items]} checked={a.equipment.includes(item)} onPress={() => toggle(item)}>
              {item === 'halteres' && (
                <Field
                  label={e.dumbbellMax}
                  unit={e.kgUnit}
                  value={a.dumbbellMaxKg}
                  onChangeText={(dumbbellMaxKg) => set({ dumbbellMaxKg })}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  error={rangeError(a.dumbbellMaxKg, LIMITS.dumbbell)}
                />
              )}
              {item === 'barra_anilhas' && (
                <Field
                  label={e.barbellMax}
                  unit={e.kgUnit}
                  value={a.barbellMaxKg}
                  onChangeText={(barbellMaxKg) => set({ barbellMaxKg })}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  error={rangeError(a.barbellMaxKg, LIMITS.barbell)}
                />
              )}
            </CheckRow>
          ))}
        </View>
      ))}
      {a.equipment.length === 0 && (
        <T variant="body" color={colors.textSecondary}>
          {e.none}
        </T>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
