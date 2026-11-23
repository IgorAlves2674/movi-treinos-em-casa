import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FigureView } from '@/components/figure/FigureView';
import { ViewSelector } from '@/components/figure/ViewSelector';
import { Card, T } from '@/components/ui';
import { animacaoDoBoneco, EXERCICIOS, type Exercicio } from '@/content/exercises';
import { rotuloEquipamentos } from '@/content/exercises/labels';
import type { FigureView as View3D } from '@/figure/types';
import { fmt, strings } from '@/i18n';
import { colors, spacing } from '@/theme';

/** Tela de conferência (só em desenvolvimento): todos os exercícios do banco com o boneco. */
export default function ExerciseReviewScreen() {
  // Em telas largas (tablet/navegador), várias colunas para conferir mais rápido.
  const { width } = useWindowDimensions();
  const columns = width >= 1000 ? 4 : width >= 700 ? 2 : 1;
  // ?t=0.45 congela todos no mesmo instante do ciclo (para conferir poses).
  // ?ids=a,b mostra só esses exercícios.
  const params = useLocalSearchParams<{ t?: string; ids?: string }>();
  const frozenAt = params.t !== undefined ? Number(params.t) : undefined;
  const lista = params.ids ? EXERCICIOS.filter((e) => params.ids!.split(',').includes(e.id)) : EXERCICIOS;
  return (
    <>
      <Stack.Screen options={{ title: `${strings.dev.figureDemoTitle} (${EXERCICIOS.length})` }} />
      <FlatList
        data={lista}
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <ExerciseCard ex={item} frozenAt={frozenAt} />}
        contentContainerStyle={styles.list}
        initialNumToRender={3}
        windowSize={5}
      />
    </>
  );
}

function ExerciseCard({ ex, frozenAt }: { ex: Exercicio; frozenAt?: number }) {
  const anim = useMemo(() => animacaoDoBoneco(ex), [ex]);
  const [view, setView] = useState<View3D>(ex.vistas[0]);
  const s = strings.exercise;
  const tags = [
    s.positions[ex.posicao],
    rotuloEquipamentos(ex),
    fmt(s.level, { n: ex.nivel }),
    ex.impacto === 'alto' ? 'Impacto alto' : null,
  ].filter(Boolean);
  return (
    <Card style={styles.card}>
      <FigureView anim={anim} view={view} frozenAt={frozenAt} />
      <ViewSelector views={ex.vistas} value={view} onChange={setView} />
      <View style={{ gap: 4 }}>
        <T variant="title">{ex.nome}</T>
        <T variant="caption" color={colors.primary}>
          {s.muscles[ex.musculo_principal]}
          {ex.musculos_secundarios.length > 0 &&
            ` · ${ex.musculos_secundarios.map((m) => s.muscles[m]).join(', ')}`}
        </T>
        <T variant="caption" color={colors.textSecondary}>
          {tags.join(' · ')}
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, gap: 18 },
  row: { gap: 18 },
  card: { gap: spacing.md, padding: 10, flex: 1 },
});
