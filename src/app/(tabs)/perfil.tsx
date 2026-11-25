import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { DevSyncPanel } from '@/components/DevSyncPanel';
import { ChevronRightIcon } from '@/components/icons';
import { Card, PrimaryButton, Screen, SecondaryButton, T } from '@/components/ui';
import type { ProfileRow } from '@/db/tables';
import { fmt, strings } from '@/i18n';
import { formatDecimal } from '@/lib/dates';
import { deleteAccount } from '@/profile/deleteAccount';
import { answersFromProfile, restOf, type Section } from '@/profile/edit';
import { resetProfileForTesting, useProfile } from '@/profile/useProfile';
import { colors, fonts, radius, spacing } from '@/theme';
import { REST } from '@/workout/generator';

const s = strings.profile;
const ob = strings.onboarding;

/** Perfil (spec seção 3): editar tudo, descanso, assinatura e excluir conta. */
export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!profile) return <Screen>{null}</Screen>;

  const edit = (section: Section) => router.push({ pathname: '/editar-perfil', params: { secao: section } });

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <T variant="h1">{profile.name}</T>
        <T variant="body" color={colors.textSecondary}>
          {fmt(s.summary, { age: profile.age, height: formatDecimal(profile.height_cm) })}
        </T>
      </View>

      <Card style={styles.list}>
        <Row label={s.rows.data} value={profile.name} onPress={() => edit('data')} first />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <T variant="overline" color={colors.textSecondary}>
          {s.sectionTraining}
        </T>
        <Card style={styles.list}>
          {(['goal', 'level', 'routine', 'restrictions', 'equipment', 'rest'] as const).map((section, i) => (
            <Row key={section} label={s.rows[section]} value={valueOf(section, profile)} onPress={() => edit(section)} first={i === 0} />
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <T variant="overline" color={colors.textSecondary}>
          {s.sectionAccount}
        </T>
        <Card style={styles.list}>
          <Row label={s.subscription} value={s.subscriptionValue} first />
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmDelete(true)}
            style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]}
          >
            <T variant="label" color={colors.danger}>
              {s.deleteAccount}
            </T>
          </Pressable>
        </Card>
      </View>

      {__DEV__ && (
        <View style={{ gap: spacing.sm }}>
          <T variant="overline" color={colors.textSecondary}>
            {s.devTitle}
          </T>
          <SecondaryButton label={strings.dev.figureDemo} onPress={() => router.push('/boneco-teste')} />
          <SecondaryButton label={strings.dev.resetOnboarding} onPress={() => void resetProfileForTesting(db)} />
          <DevSyncPanel />
        </View>
      )}

      <DeleteDialog visible={confirmDelete} onClose={() => setConfirmDelete(false)} />
    </Screen>
  );
}

/** Resumo de cada parte do perfil, mostrado à direita da linha. */
function valueOf(section: Section, p: ProfileRow): string {
  const a = answersFromProfile(p);
  switch (section) {
    case 'data':
      return p.name;
    case 'goal':
      return ob.goal.options[p.goal].label;
    case 'level':
      return ob.level.options[p.level].label;
    case 'routine':
      return fmt(s.routineValue, { days: p.days_per_week, minutes: p.minutes_per_session });
    case 'restrictions': {
      const parts = [a.avoidJumpsNoise && s.restrictionsJumps, a.avoidImpact && s.restrictionsImpact].filter(Boolean);
      return parts.length ? parts.join(' · ') : s.restrictionsNone;
    }
    case 'equipment': {
      const n = a.equipment.length;
      return n === 0 ? s.equipmentNone : n === 1 ? s.equipmentOne : fmt(s.equipmentCount, { n });
    }
    case 'rest': {
      const r = restOf(p);
      const d = REST[p.level];
      const isDefault = r.sets === d.sets && r.circuitExercise === d.circuitExercise && r.circuitRound === d.circuitRound;
      return isDefault ? s.restDefault : s.restCustom;
    }
  }
}

function Row({ label, value, onPress, first }: { label: string; value: string; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}
    >
      <T variant="label" style={{ flex: 1 }}>
        {label}
      </T>
      <T variant="body" color={colors.textSecondary} numberOfLines={1} style={styles.value}>
        {value}
      </T>
      {onPress && <ChevronRightIcon />}
    </Pressable>
  );
}

/** Confirmação antes de excluir a conta. */
function DeleteDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const db = useSQLiteContext();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const busyRef = useRef(false);

  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setDeleting(true);
    setError(false);
    const result = await deleteAccount(db);
    busyRef.current = false;
    setDeleting(false);
    // Deu certo: o perfil some e o app volta para o onboarding sozinho.
    if (result === 'error') setError(true);
    else onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.dialog}>
          <T variant="h2">{s.deleteTitle}</T>
          <T variant="body" color={colors.textSecondary} style={{ lineHeight: 20 }}>
            {s.deleteText}
          </T>
          {error && (
            <T variant="caption" color={colors.danger}>
              {s.deleteError}
            </T>
          )}
          <PrimaryButton
            label={deleting ? s.deleting : s.deleteConfirm}
            onPress={confirm}
            disabled={deleting}
            style={{ backgroundColor: colors.danger }}
          />
          <SecondaryButton label={s.deleteCancel} onPress={onClose} disabled={deleting} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 14, paddingHorizontal: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  value: { maxWidth: '55%', textAlign: 'right', fontFamily: fonts.regular },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  dialog: { gap: spacing.md, padding: spacing.xl, borderRadius: radius.xl },
});
