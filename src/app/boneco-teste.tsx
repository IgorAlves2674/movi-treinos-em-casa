import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FigureView } from '@/components/figure/FigureView';
import { ViewSelector } from '@/components/figure/ViewSelector';
import { Card, Screen, T } from '@/components/ui';
import { DEMO_ANIMATIONS } from '@/figure/demoAnimations';
import type { FigureView as View3D } from '@/figure/types';
import { strings } from '@/i18n';
import { colors, spacing } from '@/theme';

/** Tela de teste da etapa 2: os 4 exercícios do protótipo, cada um com seletor de vista. */
export default function FigureDemoScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.dev.figureDemoTitle }} />
      <Screen>
        {DEMO_ANIMATIONS.map((d) => (
          <DemoCard key={d.id} {...d} />
        ))}
      </Screen>
    </>
  );
}

function DemoCard({ name, info, anim }: (typeof DEMO_ANIMATIONS)[number]) {
  const [view, setView] = useState<View3D>('lateral');
  return (
    <Card style={styles.card}>
      <FigureView anim={anim} view={view} />
      <ViewSelector views={anim.views} value={view} onChange={setView} />
      <View style={{ gap: 2 }}>
        <T variant="title">{name}</T>
        <T variant="caption" color={colors.textSecondary}>
          {info}
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: 10 },
});
