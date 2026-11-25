import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigureView } from '@/components/figure/FigureView';
import { ViewSelector } from '@/components/figure/ViewSelector';
import { Card, T } from '@/components/ui';
import { animacaoDoBoneco, getExercicio } from '@/content/exercises';
import { rotuloEquipamentos } from '@/content/exercises/labels';
import type { FigureView as View3D } from '@/figure/types';
import { fmt, strings } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

/**
 * Janela de informações do exercício (spec seção 3): boneco animado com seletor
 * de vista, músculos, equipamento, passo a passo e erros comuns.
 */
export function ExerciseInfoModal({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  return (
    <Modal visible={exerciseId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {exerciseId && <Content exerciseId={exerciseId} onClose={onClose} />}
    </Modal>
  );
}

function Content({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const e = getExercicio(exerciseId);
  const anim = useMemo(() => (e ? animacaoDoBoneco(e) : null), [e]);
  const [view, setView] = useState<View3D>(e?.vistas[0] ?? 'lateral');
  if (!e || !anim) return null;
  const s = strings.exercise;
  const info = strings.exerciseInfo;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <T variant="h2" style={{ flex: 1 }}>
          {e.nome}
        </T>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12} style={styles.close}>
          <T variant="label" color={colors.primary}>
            {info.close}
          </T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <FigureView anim={anim} view={view} />
        <ViewSelector views={e.vistas} value={view} onChange={setView} />
        <View style={{ gap: 4 }}>
          <T variant="label" color={colors.primary}>
            {s.muscles[e.musculo_principal]}
            {e.musculos_secundarios.length > 0 && (
              <T variant="body" color={colors.textSecondary}>
                {' · '}
                {e.musculos_secundarios.map((m) => s.muscles[m]).join(', ')}
              </T>
            )}
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {info.equipment}: {rotuloEquipamentos(e)} · {s.positions[e.posicao]} · {fmt(s.level, { n: e.nivel })}
          </T>
        </View>
        <Card style={{ gap: spacing.sm }}>
          <T variant="title">{info.steps}</T>
          {e.passo_a_passo.map((p, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <T variant="caption" color={colors.textOnDark} style={{ fontWeight: '700' }}>
                  {i + 1}
                </T>
              </View>
              <T variant="body" style={{ flex: 1, lineHeight: 20 }}>
                {p}
              </T>
            </View>
          ))}
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <T variant="title">{info.mistakes}</T>
          {e.erros_comuns.map((m, i) => (
            <View key={i} style={styles.stepRow}>
              <T variant="body" color={colors.danger}>
                ✕
              </T>
              <T variant="body" style={{ flex: 1, lineHeight: 20 }}>
                {m}
              </T>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  close: { paddingVertical: 6, paddingHorizontal: 4 },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
