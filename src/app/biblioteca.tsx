import { Stack } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ExerciseInfoModal } from '@/components/ExerciseInfoModal';
import { FigureView } from '@/components/figure/FigureView';
import { CheckRow, Chip } from '@/components/form';
import { ChevronRightIcon } from '@/components/icons';
import { T } from '@/components/ui';
import { animacaoDoBoneco, EXERCICIOS, type Exercicio } from '@/content/exercises';
import { rotuloEquipamentos } from '@/content/exercises/labels';
import { fmt, strings } from '@/i18n';
import { useProfile } from '@/profile/useProfile';
import { colors, fonts, radius, spacing } from '@/theme';
import { generatorProfile } from '@/workout/fromProfile';
import { hasEquipment } from '@/workout/generator';

const s = strings.library;
type Group = keyof typeof s.groups;
const GROUPS = Object.keys(s.groups) as Group[];

/** Grupo da biblioteca: aquecimento/alongamento e cardio pelo padrão; o resto pelo músculo principal. */
function groupOf(e: Exercicio): Group {
  if (e.padrao_movimento === 'alongamento' || e.padrao_movimento === 'mobilidade') return 'mobilidade';
  if (e.padrao_movimento === 'cardio' || e.musculo_principal === 'corpo_inteiro') return 'cardio';
  switch (e.musculo_principal) {
    case 'peitoral':
      return 'peito';
    case 'dorsais':
    case 'trapezio':
    case 'lombar':
      return 'costas';
    case 'deltoide_anterior':
    case 'deltoide_lateral':
    case 'deltoide_posterior':
      return 'ombros';
    case 'biceps':
    case 'triceps':
    case 'antebraco':
      return 'bracos';
    case 'abdomen':
    case 'obliquos':
      return 'core';
    default:
      return 'pernas';
  }
}

/** Sem acento e em minúsculas, para a busca achar "flexao" e "Flexão". */
const normalize = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const SORTED = [...EXERCICIOS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

/** Biblioteca (spec seção 3, menu ⋮): todos os exercícios, com busca, filtro e informações. */
export default function LibraryScreen() {
  const { profile } = useProfile();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | null>(null);
  const [mine, setMine] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);
  const equipment = useMemo(() => (profile ? generatorProfile(profile).equipment : []), [profile]);

  const list = useMemo(() => {
    const q = normalize(query);
    return SORTED.filter(
      (e) =>
        (!group || groupOf(e) === group) &&
        (!mine || hasEquipment(e, equipment)) &&
        (!q || normalize(e.nome).includes(q) || normalize(strings.exercise.muscles[e.musculo_principal]).includes(q)),
    );
  }, [query, group, mine, equipment]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: strings.menu.library }} />
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={s.search}
              placeholderTextColor={colors.textSecondary}
              style={styles.search}
              accessibilityLabel={s.search}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={s.all} selected={group === null} onPress={() => setGroup(null)} />
              {GROUPS.map((g) => (
                <Chip key={g} label={s.groups[g]} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />
              ))}
            </ScrollView>
            <CheckRow label={s.mine} checked={mine} onPress={() => setMine(!mine)} />
            <T variant="caption" color={colors.textSecondary}>
              {list.length === 1 ? s.countOne : fmt(s.count, { n: list.length })}
            </T>
          </View>
        }
        ListEmptyComponent={
          <T variant="body" color={colors.textSecondary}>
            {s.empty}
          </T>
        }
        renderItem={({ item }) => <Row exercise={item} onPress={setInfoId} />}
      />
      <ExerciseInfoModal exerciseId={infoId} onClose={() => setInfoId(null)} />
    </View>
  );
}

const Row = memo(function Row({ exercise: e, onPress }: { exercise: Exercicio; onPress: (id: string) => void }) {
  const anim = useMemo(() => animacaoDoBoneco(e), [e]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(e.id)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={{ width: 72 }}>
        <FigureView anim={anim} view={e.vistas[0]} frozenAt={0.4} style={{ borderRadius: radius.sm }} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="label" numberOfLines={2}>
          {e.nome}
        </T>
        <T variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
          {strings.exercise.muscles[e.musculo_principal]}
        </T>
        <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {rotuloEquipamentos(e)}
        </T>
      </View>
      <ChevronRightIcon />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.sm },
  search: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  chips: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
  },
});
